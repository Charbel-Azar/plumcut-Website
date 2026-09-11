'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { markdown, articleJsonLd, renderSitemap, validatePage } = require('./build-blog');
const { verifyContent } = require('./verify-blog');

test('editorial links preserve query parameters and reject executable URLs', () => {
  const result = markdown('[source](https://example.com/?a=1&b=2)').html;
  assert.match(result, /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
  assert.doesNotMatch(result, /nofollow|amp;amp/);
  assert.throws(() => markdown('[bad](javascript:alert)'), /unsupported link/);
});

test('FAQ schema preserves visible formatted answers and cannot close its script', () => {
  const faq = [{ q: 'Why?', a: '**Read** [this](/pricing). </script>' }];
  const markup = articleJsonLd({ title: 'Test', date: '2026-09-07', slug: 'test', faq });
  // One closer per emitted block (BlogPosting, Organization, WebSite,
  // BreadcrumbList, FAQPage) and not one more: a sixth would mean the
  // </script> inside the answer escaped the string it belongs to.
  assert.equal((markup.match(/<\/script>/g) || []).length, 5);
  const schema = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1])).find(s => s['@type'] === 'FAQPage');
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, markdown(faq[0].a).html);
});

test('sitemap uses actual article revisions and omits unknown core dates', () => {
  const sitemap = renderSitemap([{ slug: 'test', date: '2026-09-01', updated: '2026-09-07' }]);
  assert.match(sitemap, /<loc>https:\/\/plumcut.com\/blog\/<\/loc>\s*<lastmod>2026-09-07/);
  assert.match(sitemap, /<loc>https:\/\/plumcut.com\/<\/loc>\s*<\/url>/);
});

test('page validator rejects mismatched FAQs and unpublished blog links', () => {
  const html = '<link rel="canonical" href="https://plumcut.com/blog/test"><h1>Test</h1>';
  assert.throws(() => validatePage('/blog/test', html + '<a href="/blog/missing">Missing</a>', new Map()), /missing blog destination/);
  const schema = '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"name":"Why?","acceptedAnswer":{"text":"<p>Right</p>"}}]}</script>';
  const faqItem = a => `<summary><h3 class="blog-faq-q">Why?</h3></summary><div class="blog-faq-answer">${a}</div>`;
  assert.throws(() => validatePage('/blog/test', html + schema + faqItem('<p>Wrong</p>'), new Map()), /FAQ text mismatch/);
  assert.throws(() => validatePage('/blog/test', html + schema + '<summary>Why?</summary><div class="blog-faq-answer"><p>Right</p></div>', new Map()), /FAQ count mismatch/);
  assert.doesNotThrow(() => validatePage('/blog/test', html + schema + faqItem('<p>Right</p>'), new Map()));
});

test('deployment verification rejects a stale 200 response and missing sitemap entry', () => {
  const article = '<meta name="plumcut-content-version" content="' + 'a'.repeat(64) + '"><link rel="canonical" href="https://plumcut.com/blog/test">';
  const sitemap = '<loc>https://plumcut.com/blog/test</loc>';
  assert.doesNotThrow(() => verifyContent('test', article, article, sitemap));
  assert.throws(() => verifyContent('test', article, article.replace('a'.repeat(64), 'b'.repeat(64)), sitemap), /stale/);
  assert.throws(() => verifyContent('test', article, article, ''), /sitemap/);
});

test('check mode renders, writes nothing, and rejects invalid input without replacing output', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'plumcut-blog-test-'));
  try {
    fs.mkdirSync(path.join(fixture, 'scripts', 'templates'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'blog', 'posts'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'images', 'index'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'images', 'index', 'Bullet-Orange.svg'), '<svg/>');
    fs.copyFileSync(path.join(__dirname, 'build-blog.js'), path.join(fixture, 'scripts', 'build-blog.js'));
    const template = path.join(fixture, 'scripts', 'templates', 'page.html');
    fs.writeFileSync(template, '<head><link rel="canonical" href="{{URL}}">{{JSONLD}}</head>{{MAIN}}');
    const sentinel = path.join(fixture, 'blog', 'index.html');
    fs.writeFileSync(sentinel, 'existing live output');
    const before = fs.readFileSync(sentinel, 'utf8');
    const run = (...args) => spawnSync(process.execPath, ['scripts/build-blog.js', ...args], { cwd: fixture, encoding: 'utf8' });
    const checked = run('--check');
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), before);
    assert.equal(fs.existsSync(path.join(fixture, 'sitemap.xml')), false);
    fs.appendFileSync(template, '{{UNKNOWN}}');
    const invalidTemplate = run('--check');
    assert.notEqual(invalidTemplate.status, 0);
    assert.match(invalidTemplate.stderr, /unresolved template token/);
    fs.writeFileSync(path.join(fixture, 'blog', 'posts', 'bad.md'), '---\ntitle: Bad\ndescription: Bad\ndate: 2026-02-30\n---\nBody');
    assert.match(run().stderr, /date must be/);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), before);
    fs.writeFileSync(path.join(fixture, 'blog', 'posts', 'bad.md'), '---\ntitle: Bad\ndescription: Bad\ndate: 2026-09-07\nslug: ../escape\n---\nBody');
    assert.match(run().stderr, /invalid or reserved slug/);
  } finally {
    // This exact directory was created above solely for this test.
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
