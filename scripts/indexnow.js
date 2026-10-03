#!/usr/bin/env node
/**
 * IndexNow pinger. Tells Bing, Yandex, Seznam, Naver and the other IndexNow
 * engines that pages changed, so they recrawl in minutes instead of days.
 *
 *   node scripts/indexnow.js https://plumcut.com/blog/some-post
 *   node scripts/indexnow.js --changed            # pages changed in HEAD~1..HEAD
 *   node scripts/indexnow.js --changed <base-ref> # pages changed in <base-ref>..HEAD
 *   node scripts/indexnow.js --all                # every URL in sitemap.xml
 *   node scripts/indexnow.js --changed --dry-run  # print the URLs, send nothing
 *
 * The key is public by design: engines prove ownership by fetching KEY_LOCATION,
 * which is the key file at the repo root. Never rename or delete that file.
 *
 * Zero dependencies, same as the rest of the pipeline.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HOST = 'plumcut.com';
const SITE = `https://${HOST}`;
const KEY = '697538b93d349bb6fef6e915bfd3006e';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const ROOT = path.join(__dirname, '..');

/** Map one repo path to the clean URL it is served at, or null if it is not a page. */
function urlForFile(file) {
  if (file === 'index.html') return `${SITE}/`;
  if (/^[^/]+\.html$/.test(file)) return `${SITE}/${file.slice(0, -5)}`;
  if (file === 'blog/index.html') return `${SITE}/blog/`;
  let m = file.match(/^blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/);
  if (m) return `${SITE}/blog/${m[1]}`;
  m = file.match(/^blog\/posts\/\d{4}-\d{2}-\d{2}-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/);
  if (m) return `${SITE}/blog/${m[1]}`;
  return null;
}

function changedUrls(base) {
  const range = base && !/^0+$/.test(base) ? `${base}..HEAD` : 'HEAD~1..HEAD';
  const out = execFileSync('git', ['diff', '--name-only', range], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map(f => f.trim()).filter(Boolean).map(urlForFile).filter(Boolean);
}

function sitemapUrls() {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

async function ping(urls) {
  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls };
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = (await response.text()).trim();
  const ok = response.status === 200 || response.status === 202;
  console.log(`IndexNow ${response.status} ${ok ? 'ok' : 'FAILED'} for ${urls.length} URL(s)${text ? `: ${text}` : ''}`);
  return ok;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  let urls;
  if (args.includes('--all')) {
    urls = sitemapUrls();
  } else if (args.includes('--changed')) {
    const next = args[args.indexOf('--changed') + 1];
    urls = changedUrls(next && !next.startsWith('--') ? next : null);
  } else {
    urls = args.filter(a => !a.startsWith('--'));
  }

  urls = [...new Set(urls)];
  const foreign = urls.filter(u => {
    try { return new URL(u).host !== HOST; } catch { return true; }
  });
  if (foreign.length) throw new Error(`Not a ${HOST} URL: ${foreign.join(', ')}`);

  if (dryRun) {
    urls.forEach(u => console.log(u));
    return;
  }
  if (!urls.length) {
    console.log('IndexNow: no page URLs to submit.');
    return;
  }
  urls.forEach(u => console.log(`  ${u}`));
  // IndexNow accepts at most 10,000 URLs per request.
  for (let i = 0; i < urls.length; i += 10000) {
    if (!(await ping(urls.slice(i, i + 10000)))) process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(`IndexNow: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = { urlForFile };
