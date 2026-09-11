# plumcut.com

Static marketing site. Plain HTML, no framework, no bundler. Deployed on Vercel
from `main`; every push goes live. `cleanUrls: true`, so `/blog/foo.html` serves
at `/blog/foo`.

## Layout

```
index.html  how-it-works.html  solutions.html  pricing.html  about.html  privacy.html
assets/main.css        pre-compiled Tailwind, ~30k lines, NOT live JIT
assets/main.js         site behaviour (GSAP reveals, sticky nav, loader)
vendor/                pinned third-party JS
images/                site art, .webp preferred
blog/                  GENERATED. Do not hand-edit any .html in here.
blog/posts/*.md        the only hand-written blog source
scripts/build-blog.js  the generator
scripts/templates/page.html   the page shell, extracted verbatim from privacy.html
markdown/              the Readiness Workbook, the positioning source of truth
```

## The one CSS rule that bites

`assets/main.css` is **pre-compiled and static**. Any Tailwind utility class
that was not already used in the original template does not exist in the CSS and
silently renders as nothing. The worst version of this is on dark backgrounds:
`text-white/85` does not exist, so the text falls back to the dark default and
becomes invisible.

Text colour classes that DO exist: `text-white`, `text-white/60`,
`text-secondary`, `text-secondary/40`, `text-secondary/60`, `text-secondary/80`.

Before relying on a class, check it: `grep -E '\.classname \{' assets/main.css`.
Otherwise use inline `style="..."` or a scoped `<style>` block. Brand colours:
orange `#E65E04`, plum `#481D52`, deep plum `#4B1D6A`.

`main.css` also ships `main h2 { text-transform: uppercase; text-align: center }`
with `!important`. Article prose has to outrank that, which is why the blog CSS
carries `!important` on its heading rules.

## House rules for copy

- **No em dashes or en dashes anywhere.** Commas, full stops, or restructure.
- **plumcut and plum are always lowercase.** Never "AI agent" or "AI system".
- **WhatsApp only in public copy.** Never Instagram.
- **Posts are written in English.** No Arabic script in the body, headings or
  hero images, even in a post about Arabic. Latin-script Arabizi quoted as an
  example ("3andkon", "kifak") is fine and often the point; Arabic script is
  not. Writing *about* Arabic and MENA support is encouraged, it is a real
  differentiator and a real search term.
- Lead with selling, not support.
- Never ship a fabricated statistic, case study or testimonial.
- Any page with `FAQPage` JSON-LD must have a matching visible FAQ. The blog
  builder enforces this; on hand-written pages it is on you.

## Field notes (the blog)

The section is called **Field notes** in the UI. The URL stays `/blog/` because
that is the structural signal crawlers expect. `SECTION` in
`scripts/build-blog.js` is the single source of truth for the visible name;
change it there and every label, title, breadcrumb and feed follows.

### Building

```bash
node scripts/build-blog.js          # build everything
node scripts/build-blog.js --check  # validate and report, write nothing
node scripts/serve.js               # preview at localhost:5500
node scripts/find-image.js "terms"  # ranked, licensed hero candidates
```

Zero dependencies. No `npm install` step, ever.

Reads `blog/posts/*.md` (files starting with `_` are ignored) and writes:

- `blog/<slug>.html` for each post
- `blog/index.html`, the hub
- `blog/rss.xml`
- `sitemap.xml`, regenerated whole
- the blog listing inside `llms.txt`
- `llms-full.txt`, the full text of every post in one file
- `ai/summary.json`, `ai/service.json`, `ai/faq.json`
- `.well-known/ai.txt`

The last three groups are the AI discovery surface. `ai/faq.json` is compiled
from every post's `faq` front matter, deduplicated by question, so an FAQ answer
is published detached from its article and must stand alone. `summary.json` and
`service.json` are the `SUMMARY` and `SERVICE` constants in the builder: edit
them there, never in the generated file. All of it is regenerated on every build,
so never hand-edit anything under `ai/` or `.well-known/`.

The builder renders and validates all pages before writing. It rewrites generated
articles and removes stale pages carrying its content-version marker; unrelated
HTML is left alone. Fix problems in Markdown or the builder, never the output.

`RELATED_COUNT` (default 3) sets how many cards the "Keep reading" strip shows
at the foot of a post. A post's `related:` slugs are used first, then the newest
posts top it up.

Front matter is documented in `blog/posts/_TEMPLATE.md`. The parser is a small
YAML subset, so stay inside the shapes shown there.

The build warns on posts under 500 words (review completeness, do not pad), long
descriptions, missing heroes and normalized dashes. It fails on invalid dates or
slugs, malformed FAQs, missing related posts/internal destinations, unresolved
template tokens and FAQ/schema mismatches. Check mode renders without writing.
Run `node --test scripts/blog.test.js` after builder changes.

Optional author/authorUrl and reviewedBy/reviewerUrl fields render real attribution.
Never invent a name or claim a person reviewed an automated draft. updated is only
for a material revision. ctaLine and related are carried through Notion's publishing
metadata block. WhatsApp events include article_slug, page_path and cta.

### Changing the design

`scripts/templates/page.html` is the site shell with `{{TOKENS}}` punched into
it. It was generated from `privacy.html`, so it carries the real nav, footer,
loader, fonts and script tags. Article-specific CSS lives in the `BLOG_CSS`
constant in `scripts/build-blog.js`.

Change either one and rerun the build; every post is re-rendered at once. That
is the entire reason posts are markdown and not hand-written HTML.

If the site's shared chrome changes (nav, footer, a new script tag), regenerate
the template from the updated `privacy.html` rather than patching it by hand.

### Where the blog is linked from

Deliberately **not in the top navigation**. Five items is already tight on
mobile. It is reachable from:

- the footer `Menu` column on all six pages, labelled "Field notes"
- `sitemap.xml`, `llms.txt`, `llms-full.txt`, `robots.txt`, `blog/rss.xml`, `ai/faq.json`
- in-body links between posts, and from posts back to solutions / how-it-works / pricing

There is deliberately **no blog strip on the home page**. It was built and then
removed on request. Do not add one back without asking.

That is enough for crawlers and for AI search without cluttering the nav. Do not
add a Blog item to `.pc-nav`.

### The publishing pipeline

One run does the whole job. Run it by hand with **`/blog [topic]`**, or let the
scheduled cloud routine `plumcut blog` fire it Mon / Wed / Sat. Both read the
same runbook, so manual and scheduled runs can never drift apart.

**The runbook lives in this repo**, at `blog/tasks/author.md`. The scheduled
routine is a three-line pointer that reads that file and follows it, so changing
the runbook changes what the next run does. No API call, no routine edit. Fix a
bug in a commit.

```
one run   subject -> question -> write -> review -> build -> push -> verify -> log
```

Subjects come from the **Meetings** database first, `collection://fd9c0e54-8bb3-47f4-bd2e-fd240acfef2f`,
and from web search when no room yields one. The rule for a meeting subject is
the subject only: what area the room was about, then what the wider market asks
about that area, then whether plum honestly helps. Never a name, never a quote,
never a deal, never "a client told us". The link back to the room lives in the
internal Notion row and nowhere else.

**You steer it from the [Blog control page](https://app.notion.com/p/3d78d6e734f481298d03e96918155768)**,
under cowork - Blog. Three switches, no commit needed: `Paused` freezes the whole
thing, `Focus` points every run at one subject, `Meetings read up to` is the
watermark that stops a room being mined twice. The run appends to the log there
each time it fires.

**There is no human approval step.** What replaces it is Step 6 of the runbook, a
review pass with the authority to delete the post, plus the `Paused` switch and
`git revert`. A post that cannot be verified honestly is killed, and an empty run
is a good outcome. Notion is the record of what shipped, not the gate before it.

Content standards live in Notion under **plumcut - HQ / Brand & Identity /
Branding / cowork - Blog**: archetypes, voice, what a good post looks like.
`blog/tasks/editorial.md` keeps the essential topic, promotion and review rules
in GitHub, with Notion as supplemental guidance. Every run reads both.

After pushing, the run must pass `node scripts/verify-blog.js <slug>`, which
checks the deployed content version, canonical and sitemap. A push alone is not
publication proof.

## Hero images

**`blog/heroes/` is the library the scheduled run uses.** Licensed images
committed to the repo with `manifest.json` describing each one: alt text, tags,
credit, licence. The run matches `tags` against the post subject and copies the
entry into front matter as `hero: /blog/heroes/<file>.jpg`.

They live in the repo because the cloud sandbox's egress allowlist blocks every
image host (Unsplash, Pexels, Openverse, Flickr) while still allowing a git
clone. Self-hosting also kills hotlink breakage and link rot. Open
`blog/heroes/contact-sheet.html` to review them in the exact crop a hero uses.

`blog/ART-DIRECTION.md` defines the look and the source order. Run
`node scripts/find-image.js "search terms"` for ranked candidates with front
matter ready to paste. It uses Unsplash and Pexels when `UNSPLASH_ACCESS_KEY`
and `PEXELS_API_KEY` are set, and falls back to Openverse, which needs no key
but returns far weaker results. **Setting the Unsplash key is the single
biggest quality upgrade available to this pipeline.**

Two rules the finder cannot enforce:

- **Cosmos is never an image source.** Its images are third-party copyrighted
  work saved as references, its terms grant no reuse rights to anyone, and its
  robots.txt disallows `/api/` for every crawler. Use it to decide the look,
  then match that look on a licensed source.
- **Verify the URL actually loads.** Some hosts block hotlinking (StockSnap
  returns 403), so a URL that appears in search results can still be dead on
  the live site. `curl -I` it before committing.

## Previewing locally

`node scripts/serve.js` emulates Vercel's `cleanUrls`, so `/blog/<slug>` resolves
locally the way it does in production. Live Server and most static servers do
not, which is why extensionless URLs 404 under them.

`assets/main.css` hides every `[data-ns-animate]` element at `opacity: 0` until
GSAP ScrollTrigger reveals it, and that often does not fire in headless Chrome.
A blank-looking screenshot is usually this, not a layout bug. To see the real
layout, render a temp copy with this injected before `</head>`:

```html
<style>[data-ns-animate]{opacity:1!important;filter:none!important;transform:none!important}</style>
```

The blog templates use root-absolute asset paths (`/images/...`), which do not
resolve over `file://`. Rewrite them to `../images/...` in the temp copy too, or
serve the directory over HTTP.

Also give Chrome `--virtual-time-budget=8000` or more so the `body.is-loading`
preloader clears.
