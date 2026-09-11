#!/usr/bin/env node
/**
 * plumcut blog builder
 *
 * Reads every post in blog/posts/*.md, renders each one into the site shell
 * (scripts/templates/page.html, extracted verbatim from privacy.html so the
 * chrome can never drift), then regenerates the hub, the RSS feed, the
 * sitemap and llms.txt listing.
 *
 * Zero dependencies on purpose: the scheduled cowork agent runs `node
 * scripts/build-blog.js` with no npm install step.
 *
 *   node scripts/build-blog.js           build everything
 *   node scripts/build-blog.js --check   build to memory and report, write nothing
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const TEMPLATE = path.join(__dirname, 'templates', 'page.html');
const SITE = 'https://plumcut.com';
const OG_FALLBACK = SITE + '/images/shared/plumcut-og-image.jpg';
const WA = 'https://wa.me/96181864662?text=Hi%20plum!';
// The visible name of the section. The URL stays /blog/ because that is the
// structural signal crawlers expect; only the label is branded.
const SECTION = 'Field notes';
// How many cards the "Keep reading" strip shows at the foot of a post.
const RELATED_COUNT = 3;

const DRY = process.argv.includes('--check');

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// House rule: no em/en dashes anywhere in published copy. Normalise rather
// than fail the build, and report so the writer agent learns.
const DASH_RE = /[—–]/g;

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

// Heroes can be a remote URL or a repo path like /blog/heroes/x.jpg.
// og:image and JSON-LD both require an absolute URL, so promote local paths.
const absUrl = (u) => (!u ? '' : u.startsWith('/') ? SITE + u : u);

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ------------------------------------------------------- front matter (subset YAML)
 * Supports: key: value | key: [a, b] | key: <list of - items>
 *           faq: <list of "- q: ... / a: ..." maps>
 */
function parseFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('missing --- front matter block');

  const data = {};
  const lines = m[1].split(/\r?\n/);
  let i = 0;

  const unquote = (v) => {
    v = v.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1);
    }
    return v;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    const inline = kv[2].trim();

    if (inline) {
      if (inline.startsWith('[') && inline.endsWith(']')) {
        data[key] = inline
          .slice(1, -1)
          .split(',')
          .map((s) => unquote(s))
          .filter(Boolean);
      } else {
        data[key] = unquote(inline);
      }
      i++;
      continue;
    }

    // block: either a list of scalars or a list of maps
    const items = [];
    i++;
    while (i < lines.length && /^\s+/.test(lines[i])) {
      const item = lines[i];
      const bullet = item.match(/^\s+-\s*(.*)$/);
      if (bullet) {
        const first = bullet[1];
        const map = first.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (map) {
          const obj = { [map[1]]: unquote(map[2]) };
          i++;
          while (i < lines.length && /^\s+/.test(lines[i]) && !/^\s+-/.test(lines[i])) {
            const sub = lines[i].match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
            if (sub) obj[sub[1]] = unquote(sub[2]);
            i++;
          }
          items.push(obj);
          continue;
        }
        items.push(unquote(first));
      }
      i++;
    }
    data[key] = items;
  }

  return { data, body: m[2] };
}

/* ----------------------------------------------------------- markdown subset
 * Deliberately small and predictable: headings, paragraphs, lists, tables,
 * blockquotes, code, hr, links, images, bold/italic, inline code.
 */
function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt, src) => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`
  );
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const url = href.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(url))
      throw new Error('unsupported link URL: ' + url);
    const ext = /^https?:\/\//i.test(url) && new URL(url).origin !== SITE;
    return `<a href="${esc(url)}" class="blog-link"${
      ext ? ' target="_blank" rel="noopener"' : ''
    }>${text}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

function markdown(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  const headings = [];

  const flushParagraph = (buf) => {
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
    buf.length = 0;
  };

  const para = [];

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flushParagraph(para);
      i++;
      continue;
    }

    // fenced code
    if (/^```/.test(line)) {
      flushParagraph(para);
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre class="blog-code"><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      if (level === 2) headings.push({ id, text });
      out.push(`<h${level} id="${id}" class="blog-h${level}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^(---|\*\*\*)\s*$/.test(line)) {
      flushParagraph(para);
      out.push('<hr class="blog-hr">');
      i++;
      continue;
    }

    // blockquote (used for the citable answer block)
    if (/^>\s?/.test(line)) {
      flushParagraph(para);
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote class="blog-quote">${markdown(buf.join('\n')).html}</blockquote>`);
      continue;
    }

    // table
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) {
      flushParagraph(para);
      const cells = (r) =>
        r
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        '<div class="blog-table-wrap"><table class="blog-table"><thead><tr>' +
          head.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          rows
            .map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
            .join('') +
          '</tbody></table></div>'
      );
      continue;
    }

    // lists
    const isUl = /^\s*[-*]\s+/.test(line);
    const isOl = /^\s*\d+\.\s+/.test(line);
    if (isUl || isOl) {
      flushParagraph(para);
      const tag = isUl ? 'ul' : 'ol';
      const re = isUl ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let text = lines[i].replace(re, '');
        i++;
        // continuation lines
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) {
          text += ' ' + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(text)}</li>`);
      }
      out.push(`<${tag} class="blog-list">${items.join('')}</${tag}>`);
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushParagraph(para);

  return { html: out.join('\n'), headings };
}

/* The publisher entity every generated page carries. Values are taken from what
   the hand-written pages already assert; nothing here is invented. foundingDate
   is deliberately absent until someone supplies the real one. */
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': SITE + '/#organization',
  name: 'plumcut',
  url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/images/shared/new%20icon.png' },
  description:
    'plumcut builds and runs AI sales agents for WhatsApp, then turns customer conversations into owned customer insight for high-traffic commerce brands.',
  areaServed: [
    { '@type': 'Place', name: 'Lebanon' },
    { '@type': 'Place', name: 'Saudi Arabia' },
    { '@type': 'Place', name: 'MENA' },
  ],
  knowsAbout: [
    'WhatsApp Business Platform',
    'conversational commerce',
    'AI customer service',
    'ecommerce automation',
    'Arabic and Arabizi customer support',
    'customer conversation insight',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: 'info@plumcut.com',
    url: SITE + '/',
    areaServed: ['LB', 'SA'],
    availableLanguage: ['en', 'ar'],
  },
  sameAs: [
    'https://www.instagram.com/plumcut_/',
    'https://www.linkedin.com/company/plumcut/',
    'https://www.facebook.com/plumcut',
  ],
};

/*
 * Emitted as their own top-level JSON-LD blocks on every generated page, with
 * everything else referring to them by @id. Nesting the publisher inside the
 * article instead makes the same entity invisible to parsers that only read
 * top-level types, and repeats the whole object on every page.
 */
const ORGANIZATION_BLOCK = { '@context': 'https://schema.org', ...ORGANIZATION };
const ORG_REF = { '@id': SITE + '/#organization' };
const WEBSITE_BLOCK = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE + '/#website',
  name: 'plumcut',
  url: SITE + '/',
  inLanguage: 'en',
  publisher: ORG_REF,
};

/* ------------------------------------------------------------------ pieces */

function faqBlock(faq) {
  if (!faq || !faq.length) return '';
  return `
<section class="blog-faq" aria-labelledby="blog-faq-title">
  <h2 id="blog-faq-title" class="blog-h2">Questions people also ask</h2>
  ${faq
    .map(
      (f) => `<details class="blog-faq-item">
    <summary><h3 class="blog-faq-q">${esc(f.q)}</h3></summary>
    <div class="blog-faq-answer">${markdown(f.a).html}</div>
  </details>`
    )
    .join('\n  ')}
</section>`;
}

/**
 * The closing CTA, using the same "Don't take our word for it" section as the
 * home page. Markup and class names are copied from index.html so the two stay
 * visually identical; the rules those classes need live in BLOG_CSS, because
 * they are scoped inside index.html rather than compiled into main.css.
 */
function ctaBlock(post) {
  const line =
    post.ctaLine ||
    'Most companies can only describe their product. You can message ours. Ask plum about availability, its benefits to you, and skip the FAQ rabbit hole while you are at it. See how it answers, how it sells, and how it sounds. Then we will build you your own.';
  return `
<section class="final-combined blog-final-cta" aria-labelledby="blog-cta-title">
  <div class="combined-card">
    <div class="relative z-10 px-6 py-12 md:px-10 md:py-16">
      <div class="text-center max-w-[820px] mx-auto space-y-4 md:space-y-5">
        <span class="section-title-label">
          <img class="section-title-bullet" src="/images/index/Bullet-Orange.svg" alt="" aria-hidden="true" loading="lazy" decoding="async">
          <span class="section-title-text">Don't take our word for it</span>
        </span>
        <h2 id="blog-cta-title" class="section-title-heading">
          Have a question? Ask plum.<br>See it for yourself
        </h2>
        <p class="text-tagline-1 combined-lede max-w-[700px] mx-auto">
          ${inline(line)}
        </p>
      </div>

      <div class="flex flex-col items-center gap-5 mt-10">
        <a
          href="${WA}" data-cta="article-demo" data-article="${esc(post.slug)}"
          class="hero-cta-button inline-flex min-w-[300px] sm:min-w-[420px] items-center justify-center gap-5 rounded-full px-9 py-4 font-semibold transition"
        >
          <span class="hero-cta-icon flex items-center justify-center rounded-full">
            <img src="/images/shared/new%20icon.png" alt="" aria-hidden="true" loading="lazy" decoding="async">
          </span>
          <span>Chat with plum</span>
        </a>
        <div class="flex flex-wrap items-center justify-center gap-4">
          <a href="https://wa.me/96181864662?text=Hi%20plum!%20I%20have%20a%20question." data-cta="article-question" data-article="${esc(post.slug)}" class="combined-subpill">ask a question</a>
          <a href="https://wa.me/96181864662?text=Hi%20plum!%20I'd%20like%20to%20book%20a%2015-min%20call." data-cta="article-meeting" data-article="${esc(post.slug)}" class="combined-subpill">book a meeting</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function tocBlock(headings) {
  if (headings.length < 3) return '';
  return `
<nav class="blog-toc" aria-label="On this page">
  <p class="blog-toc-title">On this page</p>
  <ol>
    ${headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('\n    ')}
  </ol>
</nav>`;
}

function relatedBlock(post, all) {
  let picks = [];
  if (post.related && post.related.length) {
    picks = post.related.map((s) => all.find((p) => p.slug === s)).filter(Boolean);
  }
  if (picks.length < RELATED_COUNT) {
    for (const p of all) {
      if (p.slug === post.slug || picks.includes(p)) continue;
      picks.push(p);
      if (picks.length >= RELATED_COUNT) break;
    }
  }
  picks = picks.slice(0, RELATED_COUNT);
  if (!picks.length) return '';
  return `
<section class="blog-related" aria-labelledby="blog-related-title">
  <h2 id="blog-related-title" class="blog-h2">Keep reading</h2>
  <div class="blog-related-grid">
    ${picks.map((p) => card(p)).join('\n    ')}
  </div>
</section>`;
}

function card(p) {
  return `<a class="blog-card" href="/blog/${p.slug}">
      <div class="blog-card-media">
        <img src="${esc(p.hero || OG_FALLBACK)}" alt="${esc(p.heroAlt || '')}" loading="lazy" decoding="async">
      </div>
      <div class="blog-card-body">
        <span class="blog-card-tag">${esc(TYPE_LABEL[p.type] || 'Guide')}</span>
        <h3 class="blog-card-title">${esc(p.title)}</h3>
        <p class="blog-card-desc">${esc(p.description)}</p>
        <span class="blog-card-date">${fmtDate(p.date)}</span>
      </div>
    </a>`;
}

const TYPE_LABEL = {
  general: 'Automation guide',
  comparison: 'Comparison',
  direct: 'plum in practice',
};

/* --------------------------------------------------------------- page CSS */

const BLOG_CSS = `    <style>
      /* ---- blog: scoped, no invented Tailwind utilities (main.css is pre-compiled) ---- */
      .blog-shell { max-width: 780px; margin: 0 auto; }
      .blog-wide { max-width: 1180px; margin: 0 auto; }
      .blog-hero-media { border-radius: 24px; overflow: hidden; margin-bottom: 2.5rem; background: #f2ecf4; }
      .blog-hero-media img { width: 100%; height: clamp(220px, 38vw, 460px); object-fit: cover; display: block; }
      .blog-hero-credit { font-size: 0.78rem; color: #481D52; opacity: 0.55; margin-top: 0.6rem; text-align: right; }
      .blog-hero-credit a { text-decoration: underline; }
      .blog-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; color: #481D52; opacity: 0.7; font-size: 0.9rem; margin-bottom: 1.25rem; }
      .blog-tag { background: #E65E04; color: #fff; border-radius: 999px; padding: 0.22rem 0.8rem; font-size: 0.78rem; letter-spacing: 0.02em; opacity: 1; }
      .blog-body { color: #481D52; font-size: clamp(1rem, 1.05vw, 1.12rem); line-height: 1.75; }
      /* main.css ships a "main h2" rule forcing uppercase + centred with
         !important. That suits the section titles but not article prose.
         These selectors outrank it, so they need !important too. Scoped to the
         prose containers only: the closing CTA reuses the home page section
         styling and must keep the centred uppercase treatment. */
      main .blog-body h2, main .blog-body h3, main .blog-body h4,
      main .blog-faq h2, main .blog-faq h3, main .blog-related h2, main .blog-related h3,
      main .blog-index-head h2, main .blog-index .blog-card-title {
        text-align: left !important;
        text-transform: none !important;
        font-family: 'Alan Sans', sans-serif !important;
        font-weight: 500 !important;
      }
      main .blog-body .blog-h2, main .blog-faq .blog-h2, main .blog-related .blog-h2 {
        font-size: clamp(1.45rem, 2.2vw, 1.95rem) !important;
        line-height: 1.28 !important;
      }
      main .blog-body .blog-h3 { font-size: clamp(1.15rem, 1.6vw, 1.35rem) !important; line-height: 1.35 !important; }
      main .blog-related .blog-card-title, main .blog-index .blog-card-title {
        font-size: 1.1rem !important; line-height: 1.35 !important;
      }
      .blog-h2 { font-size: clamp(1.45rem, 2.2vw, 1.95rem); font-weight: 500; color: #481D52; margin: 2.6rem 0 0.9rem; line-height: 1.28; }
      .blog-h3 { font-size: clamp(1.15rem, 1.6vw, 1.35rem); font-weight: 500; color: #481D52; margin: 1.9rem 0 0.6rem; }
      .blog-h4 { font-size: 1.05rem; font-weight: 500; color: #481D52; margin: 1.4rem 0 0.4rem; }
      .blog-body p { margin: 0 0 1.15rem; }
      .blog-list { margin: 0 0 1.3rem 1.15rem; }
      .blog-list li { margin-bottom: 0.55rem; list-style: disc; }
      ol.blog-list li { list-style: decimal; }
      .blog-link { color: #E65E04; text-decoration: underline; text-underline-offset: 3px; }
      .blog-link:hover { opacity: 0.75; }
      .blog-quote { border-left: 3px solid #E65E04; background: #faf6fb; border-radius: 0 14px 14px 0; padding: 1.15rem 1.35rem; margin: 1.6rem 0; }
      .blog-quote p:last-child { margin-bottom: 0; }
      .blog-hr { border: 0; border-top: 1px solid rgba(72,29,82,0.15); margin: 2.4rem 0; }
      .blog-code { background: #2b0c3c; color: #f6efe9; border-radius: 14px; padding: 1rem 1.2rem; overflow-x: auto; font-size: 0.88rem; margin: 0 0 1.4rem; }
      .blog-table-wrap { overflow-x: auto; margin: 0 0 1.6rem; border-radius: 16px; border: 1px solid rgba(72,29,82,0.14); }
      .blog-table { width: 100%; border-collapse: collapse; font-size: 0.94rem; min-width: 520px; }
      .blog-table th { background: #481D52; color: #fff; text-align: left; padding: 0.8rem 1rem; font-weight: 500; }
      .blog-table td { padding: 0.8rem 1rem; border-top: 1px solid rgba(72,29,82,0.12); color: #481D52; vertical-align: top; }
      .blog-toc { background: #faf6fb; border: 1px solid rgba(72,29,82,0.12); border-radius: 18px; padding: 1.2rem 1.4rem; margin: 0 0 2.2rem; }
      .blog-toc-title { font-size: 0.8rem; letter-spacing: 0.09em; text-transform: uppercase; color: #E65E04; margin-bottom: 0.65rem; }
      .blog-toc ol { margin: 0; padding-left: 1.1rem; }
      .blog-toc li { list-style: decimal; margin-bottom: 0.35rem; color: #481D52; }
      .blog-toc a:hover { color: #E65E04; }
      .blog-faq { margin-top: 3rem; }
      .blog-faq-item { border-bottom: 1px solid rgba(72,29,82,0.14); padding: 0.35rem 0; }
      .blog-faq-item summary { cursor: pointer; list-style: none; padding: 0.95rem 2rem 0.95rem 0; color: #481D52; font-size: 1.02rem; position: relative; }
      .blog-faq-item summary::-webkit-details-marker { display: none; }
      main .blog-faq .blog-faq-q {
        display: inline; margin: 0 !important; padding: 0 !important;
        font-size: inherit !important; line-height: inherit !important;
        font-weight: 500 !important; color: inherit !important;
      }
      .blog-faq-item summary::after { content: "+"; position: absolute; right: 0.2rem; top: 50%; transform: translateY(-50%); color: #E65E04; font-size: 1.35rem; line-height: 1; }
      .blog-faq-item[open] summary::after { content: "\\2013"; }
      .blog-faq-answer { padding: 0 0 1.1rem; color: #481D52; opacity: 0.85; }
      .blog-faq-answer p:last-child { margin-bottom: 0; }
      /* ---- closing CTA: the home page "Don't take our word for it" section.
         These rules are scoped inside index.html rather than compiled into
         main.css, so they are duplicated here verbatim. If the home page
         version changes, change this to match. ---- */
      .blog-final-cta { margin: 3.5rem 0 0; }
      .blog-final-cta .combined-card { background: #481D52; border-radius: 26px; overflow: hidden; }
      .blog-final-cta .section-title-label { color: #E65E04; justify-content: center; }
      .blog-final-cta .section-title-heading { color: #ffffff; }
      .blog-final-cta .combined-lede { color: rgba(255, 255, 255, 0.78); }
      .blog-final-cta .hero-cta-button {
        position: relative; overflow: hidden; isolation: isolate;
        border: 1px solid rgba(255, 255, 255, 0.6);
        background: linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.62) 48%, rgba(255,255,255,0.9) 100%);
        background-size: 220% 100%; background-position: 0% 50%;
        color: #4B1D6A;
        box-shadow: 0 26px 55px rgba(14,6,26,0.35), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -10px 25px rgba(255,255,255,0.25);
        font-size: clamp(1.25rem, 1.8vw, 1.75rem); line-height: 1.1;
        padding: clamp(0.35rem, 0.75vw, 0.6rem) clamp(1.85rem, 3.2vw, 2.25rem);
        justify-content: center; gap: clamp(0.75rem, 1.4vw, 1rem);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        animation: hero-cta-glass 6s ease-in-out infinite;
        transition: color .35s ease, border-color .35s ease, box-shadow .35s ease;
      }
      .blog-final-cta .hero-cta-button > * { position: relative; z-index: 2; }
      .blog-final-cta .hero-cta-button::before {
        content: ""; position: absolute; inset: 0; background: rgba(255,255,255,0.45);
        opacity: 0; transition: opacity .35s ease; z-index: 1; pointer-events: none;
      }
      .blog-final-cta .hero-cta-button:hover { border-color: rgba(255,255,255,0.95); }
      .blog-final-cta .hero-cta-button:hover::before { opacity: 1; }
      .blog-final-cta .hero-cta-icon {
        width: clamp(2.8rem, 4vw, 3.4rem); height: clamp(2.8rem, 4vw, 3.4rem);
        background: transparent; border: none; box-shadow: none;
      }
      .blog-final-cta .hero-cta-icon img { width: clamp(1.9rem, 2.5vw, 2.3rem); height: clamp(1.9rem, 2.5vw, 2.3rem); }
      .blog-final-cta .combined-subpill {
        display: inline-flex; align-items: center; justify-content: center;
        border: 1.5px solid rgba(255, 255, 255, 0.55); color: #ffffff;
        border-radius: 999px; padding: 0.55rem 1.6rem; font-size: 1.05rem; font-weight: 500;
        transition: background .25s ease, color .25s ease, border-color .25s ease;
      }
      .blog-final-cta .combined-subpill:hover { background: #ffffff; color: #481D52; border-color: #ffffff; }
      @keyframes hero-cta-glass {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      .blog-related { margin-top: 3.5rem; }
      .blog-topic-nav { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-bottom: 2rem; }
      .blog-topic-nav a { border: 1px solid #481D52; border-radius: 999px; padding: 0.5rem 1rem; color: #481D52; }
      .blog-topic-nav a:hover, .blog-topic-nav a:focus-visible { background: #faf6fb; text-decoration: underline; }
      .blog-topic-section { margin-top: 2.5rem; scroll-margin-top: 110px; }
      .blog-related-grid, .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.6rem; }
      .blog-card { display: flex; flex-direction: column; border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(72,29,82,0.12); transition: transform .25s ease, box-shadow .25s ease; }
      .blog-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(72,29,82,0.13); }
      .blog-card-media { background: #f2ecf4; }
      .blog-card-media img { width: 100%; height: 190px; object-fit: cover; display: block; }
      .blog-card-body { padding: 1.15rem 1.3rem 1.45rem; display: flex; flex-direction: column; gap: 0.55rem; flex: 1; }
      .blog-card-tag { color: #E65E04; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; }
      .blog-card-title { color: #481D52; font-size: 1.1rem; font-weight: 500; line-height: 1.35; }
      .blog-card-desc { color: #481D52; opacity: 0.72; font-size: 0.92rem; line-height: 1.55; flex: 1; }
      .blog-card-date { color: #481D52; opacity: 0.5; font-size: 0.8rem; }
      .blog-empty { color: #481D52; opacity: 0.7; padding: 2rem 0; }
      @media (max-width: 640px) {
        .blog-hero-media img { height: 210px; }
        .blog-cta { border-radius: 20px; }
      }
    </style>`;

/* -------------------------------------------------------------- rendering */

function render(tpl, vars) {
  return tpl.replace(/\{\{([A-Z]+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m
  );
}

function articleJsonLd(post) {
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: absUrl(post.hero) || OG_FALLBACK,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      inLanguage: 'en',
      author: post.author
        ? { '@type': 'Person', name: post.author, ...(post.authorUrl ? { url: absUrl(post.authorUrl) } : {}) }
        : { '@type': 'Organization', '@id': SITE + '/#organization', name: 'plumcut', url: SITE + '/about' },
      publisher: ORG_REF,
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
      isPartOf: { '@type': 'Blog', '@id': `${SITE}/blog/`, name: `plumcut ${SECTION.toLowerCase()}` },
    },
    ORGANIZATION_BLOCK,
    WEBSITE_BLOCK,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: SECTION, item: SITE + '/blog/' },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}/blog/${post.slug}` },
      ],
    },
  ];

  // Only emit FAQPage when a matching visible FAQ is actually rendered.
  if (post.faq && post.faq.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: markdown(f.a).html },
      })),
    });
  }

  return blocks
    .map((b) => `<script type="application/ld+json">\n${JSON.stringify(b, null, 2).replace(/</g, '\\u003c')}\n</script>`)
    .join('\n');
}

function renderPost(post, all, tpl) {
  const { html, headings } = markdown(post.body);
  const byline = post.author
    ? (post.authorUrl ? `<a href="${esc(post.authorUrl)}">${esc(post.author)}</a>` : esc(post.author))
    : '<a href="/about">plumcut</a>';
  const reviewer = post.reviewedBy
    ? `<span>Reviewed by ${post.reviewerUrl ? `<a href="${esc(post.reviewerUrl)}">${esc(post.reviewedBy)}</a>` : esc(post.reviewedBy)}</span>`
    : '';

  const hero = post.hero
    ? `<figure class="blog-hero-media">
        <img src="${esc(post.hero)}" alt="${esc(post.heroAlt || post.title)}" width="1600" height="900" fetchpriority="high" decoding="async">
      </figure>${
        post.heroCredit
          ? `\n      <p class="blog-hero-credit">Photo by <a href="${esc(
              post.heroCreditUrl || '#'
            )}" target="_blank" rel="noopener nofollow">${esc(post.heroCredit)}</a> on ${esc(
              post.heroSource || 'Unsplash'
            )}${
              post.heroLicense
                ? `, <a href="${esc(post.heroLicenseUrl || '#')}" target="_blank" rel="noopener nofollow">${esc(
                    post.heroLicense
                  )}</a>`
                : ''
            }</p>`
          : ''
      }`
    : '';

  const main = `      <article class="blog-article lg:py-[100px] pt-16 md:pt-20 lg:pb-[140px] md:pb-[100px] pb-16 mt-10 md:mt-16 lg:mt-20">
        <div class="main-container edge-safe max-w-[1880px]">
          <div class="blog-shell">

            <div class="space-y-3 mb-8">
              <p class="section-title-label sm:justify-start justify-center">
                <img class="section-title-bullet" src="/images/index/Bullet-Orange.svg" alt="" aria-hidden="true" />
                <a class="section-title-text" href="/blog/">${SECTION}</a>
              </p>
              <h1 style="color: #481D52;" class="text-heading-4">
                ${esc(post.title)}
              </h1>
              <div class="blog-meta">
                <span class="blog-tag">${esc(TYPE_LABEL[post.type] || 'Guide')}</span>
                <span>By ${byline}</span>
                <span>Published <time datetime="${esc(post.date)}">${fmtDate(post.date)}</time></span>
${post.updated ? `<span>Updated <time datetime="${esc(post.updated)}">${fmtDate(post.updated)}</time></span>` : ''}
${reviewer}
                <span>${post.readingTime} min read</span>
              </div>
            </div>

            ${hero}

            ${tocBlock(headings)}

            <div class="blog-body">
${html}
            </div>

            ${faqBlock(post.faq)}

            ${ctaBlock(post)}

            ${relatedBlock(post, all)}

          </div>
        </div>
      </article>`;

  return render(tpl, {
    AUTHOR: esc(post.author || 'plumcut'),
    TITLE: esc(post.title + ' | plumcut'),
    DESC: esc(post.description),
    KEYWORDS: esc((post.keywords || []).join(', ')),
    URL: `${SITE}/blog/${post.slug}`,
    OGTYPE: 'article',
    IMAGE: esc(absUrl(post.hero) || OG_FALLBACK),
    IMAGETYPE: /\.png(\?|$)/i.test(post.hero || '') ? 'image/png' : 'image/jpeg',
    IMAGEALT: esc(post.heroAlt || post.title),
    JSONLD: articleJsonLd(post),
    PAGECSS: BLOG_CSS,
    MAIN: main,
  });
}

function renderHub(all, tpl) {
  const groups = [
    ['general', 'Automation guides'],
    ['comparison', 'Comparisons'],
    ['direct', 'plum in practice'],
  ].map(([type, label]) => ({ type, label, posts: all.filter(p => p.type === type) }))
    .filter(group => group.posts.length);
  const cards = groups.length
    ? `<nav class="blog-topic-nav" aria-label="Browse field notes">${groups.map(g => `<a href="#${g.type}">${g.label}</a>`).join('')}</nav>` +
      groups.map(g => `<section id="${g.type}" class="blog-topic-section" aria-labelledby="${g.type}-title"><h2 id="${g.type}-title" class="blog-h2">${g.label}</h2><div class="blog-grid">${g.posts.map(card).join('\n')}</div></section>`).join('\n')
    : '<p class="blog-empty">The first posts are on their way.</p>';

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': SITE + '/blog/',
      name: 'plumcut ' + SECTION.toLowerCase(),
      description:
        'Practical guides on WhatsApp automation, AI customer conversations and customer insight for commerce brands in MENA and beyond.',
      url: SITE + '/blog/',
      inLanguage: 'en',
      publisher: ORG_REF,
      blogPost: all.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        url: `${SITE}/blog/${p.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: SECTION, item: SITE + '/blog/' },
      ],
    },
    ORGANIZATION_BLOCK,
    WEBSITE_BLOCK,
  ]
    .map((b) => `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`)
    .join('\n');

  const main = `      <section class="blog-index lg:py-[100px] pt-16 md:pt-20 lg:pb-[140px] md:pb-[100px] pb-16 mt-10 md:mt-16 lg:mt-20">
        <div class="main-container edge-safe max-w-[1880px]">
          <div class="blog-wide">

            <div class="space-y-3 mb-10 md:mb-14">
              <h1 class="section-title-label sm:justify-start justify-center">
                <img class="section-title-bullet" src="/images/index/Bullet-Orange.svg" alt="" aria-hidden="true" />
                <span class="section-title-text">${SECTION}</span>
              </h1>
              <p style="color: #481D52;" class="text-heading-4 max-w-[820px]">
                How brands actually automate WhatsApp, and what they learn about their customers when they do.
              </p>
              <p style="color: #481D52; opacity: 0.7;" class="text-tagline-1 max-w-[720px]">
                Practical guides, sourced comparisons and implementation notes from the team building plum.
              </p>
            </div>

            <div class="blog-topics">
      ${cards}
            </div>

          </div>
        </div>
      </section>`;

  return render(tpl, {
    AUTHOR: 'plumcut',
    TITLE: SECTION + ' | plumcut',
    DESC: esc(
      'Practical guides on WhatsApp automation, AI that sells, and turning customer conversations into insight you own. From the team building plum.'
    ),
    KEYWORDS: 'WhatsApp automation, AI chatbot, customer insight, ecommerce automation, MENA',
    URL: SITE + '/blog/',
    OGTYPE: 'website',
    IMAGE: OG_FALLBACK,
    IMAGETYPE: 'image/jpeg',
    IMAGEALT: 'plumcut, the AI that sells on WhatsApp',
    JSONLD: jsonld,
    PAGECSS: BLOG_CSS,
    MAIN: main,
  });
}

/**
 * The feed is byte-for-byte deterministic on purpose: lastBuildDate tracks the
 * newest post rather than the clock. Using Date.now() here dirtied rss.xml on
 * every build even when no content changed, which made a clean `git status`
 * useless as a check that the committed HTML matches its sources.
 */
function renderRss(all) {
  const items = all
    .slice(0, 30)
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>plumcut ${SECTION.toLowerCase()}</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Practical guides on WhatsApp automation, AI that sells, and customer insight you own.</description>
    <language>en</language>
    <lastBuildDate>${
      all.length ? new Date(all[0].date + 'T09:00:00Z').toUTCString() : new Date(0).toUTCString()
    }</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function renderSitemap(all) {
  // Unknown core-page dates are omitted rather than fabricated or rolled forward.
  const core = [
    ['/'], ['/how-it-works'], ['/solutions'], ['/pricing'], ['/about'], ['/privacy'],
    ['/blog/', all.map(p => p.updated || p.date).sort().pop()],
  ];
  const urls = core
    .map(([loc, mod]) => `  <url>\n    <loc>${SITE}${loc}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ''}\n  </url>`)
    .concat(
      all.map(
        (p) =>
          `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    <lastmod>${
            p.updated || p.date
          }</lastmod>\n  </url>`
      )
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/* ------------------------------------------- AI discovery endpoints */
/*
 * geo-checklist.dev discovery files. AI answer engines look for these at fixed
 * paths to get a machine-readable version of who we are and what we answer,
 * without parsing marketing HTML. Generated from posts so they cannot drift.
 *
 * Contract enforced by auditors: summary.json needs name >= 3 and description
 * >= 20 chars; faq.json needs question >= 10 and answer >= 20; service.json
 * needs name >= 3 and a non-empty capabilities array.
 */
const AI_DIR = path.join(ROOT, 'ai');
const WELL_KNOWN_DIR = path.join(ROOT, '.well-known');

const SUMMARY = {
  name: 'plumcut',
  description:
    'plumcut builds and runs plum, a managed AI agent that sells, answers, books and tracks orders on WhatsApp for commerce brands in Lebanon, the Gulf and the wider MENA region, and turns those conversations into customer insight the merchant owns.',
  url: SITE,
  founded: 'Lebanon',
  regions: ['Lebanon', 'United Arab Emirates', 'Saudi Arabia', 'Egypt', 'MENA', 'GCC'],
  languages: ['English', 'Arabic (Modern Standard)', 'Gulf Arabic', 'Levantine Arabic', 'Arabizi'],
  model: 'Managed service, not a self-serve bot builder',
  pricing: SITE + '/pricing',
};

const SERVICE = {
  name: 'plum by plumcut',
  description:
    'A managed WhatsApp AI agent built, launched and operated for the brand by plumcut, typically live in about two weeks.',
  url: SITE + '/solutions',
  provider: 'plumcut',
  serviceType: 'Managed WhatsApp AI agent',
  areaServed: ['LB', 'AE', 'SA', 'EG', 'QA', 'KW', 'BH', 'OM'],
  capabilities: [
    'Answer product and policy questions on WhatsApp in Arabic, English and Arabizi',
    'Recommend products and recover abandoned carts within Meta template rules',
    'Answer "where is my order" by reading live order and courier status',
    'Book appointments and take payments inside the conversation',
    'Escalate to a human with full conversation context',
    'Turn conversation history into customer insight the merchant owns',
  ],
};

function writeAiDiscovery(all) {
  // One FAQ entry per post, deduplicated by question, longest answer wins.
  const byQuestion = new Map();
  for (const post of all) {
    for (const item of post.faq || []) {
      const q = String(item.q || '').trim();
      const a = String(item.a || '').trim();
      if (q.length < 10 || a.length < 20) continue;
      const prev = byQuestion.get(q);
      if (!prev || a.length > prev.answer.length) {
        byQuestion.set(q, { question: q, answer: a, source: `${SITE}/blog/${post.slug}` });
      }
    }
  }
  const faqs = [...byQuestion.values()];

  const files = [
    [path.join(AI_DIR, 'summary.json'), JSON.stringify(SUMMARY, null, 2) + '\n'],
    [path.join(AI_DIR, 'service.json'), JSON.stringify(SERVICE, null, 2) + '\n'],
    [
      path.join(AI_DIR, 'faq.json'),
      JSON.stringify({ source: SITE + '/blog/', count: faqs.length, faqs }, null, 2) + '\n',
    ],
    [
      path.join(WELL_KNOWN_DIR, 'ai.txt'),
      [
        '# plumcut — AI usage policy',
        '',
        'Contact: https://plumcut.com/about',
        'Canonical: https://plumcut.com/',
        'Summary: https://plumcut.com/ai/summary.json',
        'FAQ: https://plumcut.com/ai/faq.json',
        'Service: https://plumcut.com/ai/service.json',
        'Guide: https://plumcut.com/llms.txt',
        'Full-text: https://plumcut.com/llms-full.txt',
        '',
        '# Crawling and citation are permitted for every user-agent. See /robots.txt.',
        '# Please cite the canonical URL of the page you used.',
        '',
      ].join('\n'),
    ],
  ];

  if (DRY) return faqs.length;
  fs.mkdirSync(AI_DIR, { recursive: true });
  fs.mkdirSync(WELL_KNOWN_DIR, { recursive: true });
  for (const [file, body] of files) fs.writeFileSync(file, body);
  return faqs.length;
}

/* ------------------------------------------------ llms-full.txt full text */
/*
 * llms.txt is the index; llms-full.txt is the corpus. An engine that wants the
 * whole argument without fetching twelve HTML pages reads this one file.
 */
function writeLlmsFull(all) {
  const parts = [
    '# plumcut — full text of every Field note',
    '',
    '> ' + SUMMARY.description,
    '',
    `Source: ${SITE}/blog/  ·  ${all.length} articles  ·  regenerated on every build.`,
    'Each article below is reproduced in full. Cite the canonical URL given in its Source line.',
    '',
  ];
  for (const post of all) {
    parts.push(
      '---',
      '',
      `# ${post.title}`,
      '',
      `Source: ${SITE}/blog/${post.slug}`,
      `Published: ${post.date}${post.updated ? `  ·  Updated: ${post.updated}` : ''}`,
      '',
      post.body.trim(),
      ''
    );
  }
  const out = parts.join('\n');
  if (!DRY) fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), out);
  return out.split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------ llms.txt blog listing */

/*
 * Replaces one <!-- NAME:START --> ... <!-- NAME:END --> region in place.
 * Everything outside the markers is hand-written and must survive a build.
 * Index arithmetic rather than a regex: the markers are fixed strings, and
 * escaping them into a pattern is how this kind of helper grows bugs.
 */
function replaceRegion(txt, name, body) {
  const START = `<!-- ${name}:START -->`;
  const END = `<!-- ${name}:END -->`;
  const from = txt.indexOf(START);
  const to = txt.indexOf(END, from + START.length);
  if (from === -1 || to === -1) return txt;
  return txt.slice(0, from + START.length) + (body ? '\n' + body : '') + '\n' + txt.slice(to);
}

function updateLlmsTxt(all) {
  const file = path.join(ROOT, 'llms.txt');
  if (!fs.existsSync(file)) return false;
  const txt = fs.readFileSync(file, 'utf8');

  const posts = all
    .slice(0, 25)
    .map((p) => `- [${p.title}](${SITE}/blog/${p.slug}): ${p.description}`)
    .join('\n');

  /*
   * Every published FAQ, grouped under the article that answers it. This is
   * the quick-answer layer: llms-full.txt carries the articles themselves, so
   * an engine that only needs one answer does not have to read 24,000 words
   * to find it. Answers are reproduced verbatim, so the text an engine quotes
   * is the text a reader sees on the page.
   */
  const faqs = all
    .filter((p) => (p.faq || []).length)
    .map((p) =>
      [
        `### ${p.title}`,
        `Source: ${SITE}/blog/${p.slug}`,
        '',
        ...(p.faq || []).flatMap((f) => [`**${String(f.q).trim()}**`, '', String(f.a).trim(), '']),
      ].join('\n')
    )
    .join('\n');

  let next = replaceRegion(txt, 'BLOG:LIST', posts);
  next = replaceRegion(next, 'FAQ:LIST', faqs);
  if (next === txt) return false;
  if (!DRY) fs.writeFileSync(file, next);
  return true;
}

/* -------------------------------------------------------------------- main */

function main() {
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');

  if (!fs.existsSync(POSTS_DIR)) throw new Error('missing blog/posts directory');

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  const warnings = [];
  const posts = [];

  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    let parsed;
    try {
      parsed = parseFrontMatter(raw);
    } catch (e) {
      throw new Error(`${f}: ${e.message}`);
    }
    const d = parsed.data;

    for (const req of ['title', 'description', 'date']) {
      if (!d[req]) throw new Error(`${f}: front matter is missing "${req}"`);
    }
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!validDate(d.date)) {
      throw new Error(`${f}: date must be YYYY-MM-DD, got "${d.date}"`);
    }
    if (d.updated && (!validDate(d.updated) || d.updated < d.date))
      throw new Error(`${f}: updated must be a real date on or after publication`);
    for (const key of ['title', 'description', 'author', 'authorUrl', 'reviewedBy', 'reviewerUrl', 'ctaLine']) {
      if (d[key] != null && typeof d[key] !== 'string') throw new Error(`${f}: ${key} must be text`);
    }
    for (const key of ['keywords', 'related', 'faq']) {
      if (d[key] != null && !Array.isArray(d[key])) throw new Error(`${f}: ${key} must be a list`);
    }
    for (const key of ['keywords', 'related']) {
      if ((d[key] || []).some(v => typeof v !== 'string')) throw new Error(`${f}: ${key} entries must be text`);
    }
    for (const key of ['authorUrl', 'reviewerUrl']) {
      if (d[key] && !/^(https?:\/\/|\/(?!\/))/i.test(d[key])) throw new Error(`${f}: invalid ${key}`);
    }
    if (d.authorUrl && !d.author) throw new Error(`${f}: authorUrl requires author`);
    if (d.reviewerUrl && !d.reviewedBy) throw new Error(`${f}: reviewerUrl requires reviewedBy`);
    for (const faq of d.faq || []) {
      if (!faq || typeof faq.q !== 'string' || !faq.q.trim() || typeof faq.a !== 'string' || !faq.a.trim())
        throw new Error(`${f}: each FAQ requires a nonempty q and a`);
    }
    if (/^## Publishing metadata\s*$/m.test(parsed.body) || /https?:\/\/app\.notion\.com/i.test(parsed.body))
      throw new Error(`${f}: private publishing metadata or a Notion link leaked into the body`);

    let body = parsed.body;
    const dashes = (body.match(DASH_RE) || []).length + (String(d.title).match(DASH_RE) || []).length;
    if (dashes) {
      warnings.push(`${f}: replaced ${dashes} em/en dash(es) (house rule: none)`);
      body = body.replace(DASH_RE, ',');
      d.title = String(d.title).replace(DASH_RE, ',');
      d.description = String(d.description).replace(DASH_RE, ',');
    }

    const words = body.split(/\s+/).filter(Boolean).length;

    posts.push({
      file: f,
      slug: d.slug || slugify(d.title),
      title: d.title,
      description: d.description,
      date: d.date,
      updated: d.updated || null,
      author: d.author || '',
      authorUrl: d.authorUrl || '',
      reviewedBy: d.reviewedBy || '',
      reviewerUrl: d.reviewerUrl || '',
      type: d.type || 'general',
      keywords: d.keywords || [],
      hero: d.hero || '',
      heroAlt: d.heroAlt || '',
      heroCredit: d.heroCredit || '',
      heroCreditUrl: d.heroCreditUrl || '',
      heroSource: d.heroSource || '',
      heroLicense: d.heroLicense || '',
      heroLicenseUrl: d.heroLicenseUrl || '',
      faq: d.faq || [],
      related: d.related || [],
      ctaLine: d.ctaLine || '',
      notionUrl: d.notionUrl || '',
      readingTime: Math.max(1, Math.round(words / 220)),
      words,
      body,
    });
  }

  // newest first
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? 1 : -1));

  const seen = new Set();
  for (const p of posts) {
    if (!Object.prototype.hasOwnProperty.call(TYPE_LABEL, p.type)) throw new Error(`${p.file}: invalid type ${p.type}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || p.slug === 'index')
      throw new Error(`invalid or reserved slug "${p.slug}" (${p.file})`);
    if (seen.has(p.slug)) throw new Error(`duplicate slug "${p.slug}" (${p.file})`);
    seen.add(p.slug);
    if (p.words < 500) warnings.push(`${p.file}: ${p.words} words; review completeness, do not pad for length`);
    if (p.description.length > 165)
      warnings.push(`${p.file}: description is ${p.description.length} chars, over 165`);
    if (!p.hero) warnings.push(`${p.file}: no hero image`);
  }

  const outputs = new Map();
  for (const p of posts) {
    for (const related of p.related) {
      if (!seen.has(related) || related === p.slug) throw new Error(`${p.file}: invalid related slug ${related}`);
    }
    const html = renderPost(p, posts, tpl);
    const version = crypto.createHash('sha256').update(html).digest('hex');
    outputs.set(`/blog/${p.slug}`, html.replace('</head>', `<meta name="plumcut-content-version" content="${version}">\n</head>`));
  }
  outputs.set('/blog/', renderHub(posts, tpl));

  // Render and validate everything before replacing any output, including --check.
  for (const [url, html] of outputs) validatePage(url, html, outputs);
  const sitemap = renderSitemap(posts);
  const rss = renderRss(posts);

  if (!DRY) {
    for (const [url, html] of outputs) {
      fs.writeFileSync(path.join(ROOT, url === '/blog/' ? 'blog/index.html' : url.slice(1) + '.html'), html);
    }
    // Only remove stale builder-owned articles; leave unrelated HTML alone.
    for (const file of fs.readdirSync(OUT_DIR)) {
      if (!file.endsWith('.html') || file === 'index.html' || seen.has(file.slice(0, -5))) continue;
      const target = path.join(OUT_DIR, file);
      if (fs.readFileSync(target, 'utf8').includes('name="plumcut-content-version"')) fs.unlinkSync(target);
    }
    fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), rss);
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
  }
  const llmsTouched = updateLlmsTxt(posts);
  const faqCount = writeAiDiscovery(posts);
  const fullWords = writeLlmsFull(posts);

  console.log(`${DRY ? '[check] ' : ''}built ${posts.length} post(s)`);
  for (const p of posts) console.log(`  /blog/${p.slug}  (${p.words}w, ${p.readingTime}min)`);
  console.log(
    `  /blog/  hub + rss.xml + sitemap.xml${llmsTouched ? ' + llms.txt' : ''}`
  );
  console.log(`  /ai/    summary.json + service.json + faq.json (${faqCount} Q&A) + /.well-known/ai.txt`);
  console.log(`  /llms-full.txt  ${fullWords} words`);
  if (warnings.length) {
    console.log('\nwarnings:');
    for (const w of warnings) console.log('  ! ' + w);
  }
}

function validatePage(url, html, outputs) {
  if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error(`${url}: unresolved template token`);
  if ((html.match(/<h1\b/g) || []).length !== 1) throw new Error(`${url}: expected exactly one h1`);
  if (!html.includes(`rel="canonical" href="${SITE}${url}"`)) throw new Error(`${url}: invalid canonical`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  const answers = [...html.matchAll(/<summary><h3 class="blog-faq-q">([\s\S]*?)<\/h3><\/summary>\s*<div class="blog-faq-answer">([\s\S]*?)<\/div>/g)];
  if ((faq?.mainEntity.length || 0) !== answers.length) throw new Error(`${url}: FAQ count mismatch`);
  answers.forEach((answer, i) => {
    if (esc(faq.mainEntity[i].name) !== answer[1] || faq.mainEntity[i].acceptedAnswer.text !== answer[2])
      throw new Error(`${url}: FAQ text mismatch`);
  });
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    const target = decodeURIComponent(match[1]);
    if (outputs.has(target)) continue;
    const base = path.resolve(ROOT, target.replace(/^\/+/, ''));
    if (!base.startsWith(ROOT + path.sep) && base !== ROOT) throw new Error(`${url}: invalid internal path ${target}`);
    if (/^\/blog\/[^/.]+\/?$/.test(target) && target !== '/blog/') throw new Error(`${url}: missing blog destination ${target}`);
    if (![base, base + '.html', path.join(base, 'index.html')].some(p => fs.existsSync(p) && fs.statSync(p).isFile()))
      throw new Error(`${url}: missing internal destination ${target}`);
  }
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { parseFrontMatter, markdown, articleJsonLd, renderSitemap, validatePage };
