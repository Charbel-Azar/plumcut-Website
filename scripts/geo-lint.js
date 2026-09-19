#!/usr/bin/env node
/**
 * geo-lint — deterministic AI-readiness lint for the published pages.
 *
 * Checks the properties an answer engine needs in order to read, attribute and
 * quote a page: a title, a description, a canonical, a declared language, one
 * H1, real heading structure, parseable JSON-LD, a coherent Organization
 * entity, and images that describe themselves.
 *
 * It does NOT predict ranking, indexing or citation. Nothing here is a ranking
 * factor. It catches regressions in properties we have decided to hold.
 *
 * Zero dependencies, by the same rule as the rest of this repo.
 *
 *   node scripts/geo-lint.js            report, exit 1 on any error
 *   node scripts/geo-lint.js --json     machine readable
 *
 * The external tool `npx geoptimize scan . --dir` covers similar ground with a
 * wider rule set and 61 npm packages. Useful occasionally, not in the build.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Files that ship to plumcut.com. Templates and internal tools are excluded. */
const EXCLUDED = new Set(['scripts/templates/page.html', 'blog/heroes/contact-sheet.html']);

/** Description length the blog builder already enforces on posts. */
const DESCRIPTION_MAX = 165;

/** Below this many H2s a page is hard to quote a section out of. */
const MIN_SECTIONS = 2;

/** The one Organization identity every page must agree on. */
const ORG_ID = 'https://plumcut.com/#organization';
const ORG_NAME = 'plumcut';

function publishedPages() {
  const pages = [];
  for (const entry of fs.readdirSync(ROOT)) {
    if (entry.endsWith('.html')) pages.push(entry);
  }
  const blog = path.join(ROOT, 'blog');
  if (fs.existsSync(blog)) {
    for (const entry of fs.readdirSync(blog)) {
      if (entry.endsWith('.html')) pages.push(`blog/${entry}`);
    }
  }
  return pages.filter((p) => !EXCLUDED.has(p)).sort();
}

function meta(html, attr, value) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]*>`, 'i');
  const tag = html.match(re);
  if (!tag) return null;
  const content = tag[0].match(/content=["']([^"']*)["']/i);
  return content ? content[1] : '';
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) blocks.push(match[1]);
  return blocks;
}

function flatten(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) flatten(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    if (Array.isArray(node['@graph'])) flatten(node['@graph'], out);
    if (node['@type']) out.push(node);
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') flatten(value, out);
    }
  }
  return out;
}

function types(node) {
  const t = node['@type'];
  return Array.isArray(t) ? t : [t];
}

/** Order-insensitive rendering of the entity, so two pages can be compared. */
function fingerprint(node) {
  const sort = (value) => {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((out, key) => {
          if (key !== '@context') out[key] = sort(value[key]);
          return out;
        }, {});
    }
    return value;
  };
  return JSON.stringify(sort(node));
}

function lintPage(rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const errors = [];
  const warnings = [];

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || !title[1].trim()) errors.push('no <title>');

  const description = meta(html, 'name', 'description');
  if (description === null) errors.push('no meta description');
  else if (!description.trim()) errors.push('empty meta description');
  else if (description.length > DESCRIPTION_MAX)
    warnings.push(`meta description is ${description.length} chars, over ${DESCRIPTION_MAX}`);

  if (!/rel=["']canonical["']/i.test(html)) errors.push('no canonical link');
  if (!/<html[^>]+lang=["'][a-z]/i.test(html)) errors.push('no lang on <html>');

  for (const property of ['og:title', 'og:description', 'og:image']) {
    if (meta(html, 'property', property) === null) warnings.push(`no ${property}`);
  }

  const h1 = html.match(/<h1[\s>]/gi) || [];
  if (h1.length === 0) errors.push('no <h1>');
  else if (h1.length > 1) errors.push(`${h1.length} <h1> elements, expected 1`);

  const h2 = html.match(/<h2[\s>]/gi) || [];
  if (h2.length < MIN_SECTIONS)
    warnings.push(`${h2.length} <h2> section(s), under ${MIN_SECTIONS}; hard to quote a section out of`);

  // Tracking pixels live in <noscript> and are not content, so they are not
  // read out and do not need alt text. Everything else does.
  const visible = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  const images = visible.match(/<img\b[^>]*>/gi) || [];
  const unlabelled = images.filter((tag) => !/\balt=/i.test(tag)).length;
  if (unlabelled) errors.push(`${unlabelled} <img> without an alt attribute`);

  const blocks = jsonLdBlocks(html);
  if (!blocks.length) errors.push('no JSON-LD');

  const nodes = [];
  blocks.forEach((raw, index) => {
    try {
      flatten(JSON.parse(raw), nodes);
    } catch (error) {
      errors.push(`JSON-LD block ${index + 1} does not parse: ${error.message}`);
    }
  });

  const organizations = nodes.filter((node) => types(node).includes('Organization'));
  if (!organizations.length) warnings.push('no Organization node in JSON-LD');
  for (const org of organizations) {
    if (org.name && org.name !== ORG_NAME)
      errors.push(`Organization name is "${org.name}", expected "${ORG_NAME}"`);
    if (org['@id'] && org['@id'] !== ORG_ID)
      errors.push(`Organization @id is "${org['@id']}", expected "${ORG_ID}"`);
  }

  // The full entity is declared once, on the node that carries the identity.
  const identity = organizations.find((org) => org['@id'] === ORG_ID && org.sameAs);
  if (identity) {
    for (const field of ['sameAs', 'contactPoint', 'address', 'areaServed', 'foundingDate']) {
      if (!identity[field]) warnings.push(`Organization is missing ${field}`);
    }
  } else {
    warnings.push('no full Organization entity, only a stub or a reference');
  }

  return { page: rel, errors, warnings, identity: identity ? fingerprint(identity) : null };
}

function main() {
  const asJson = process.argv.includes('--json');
  const results = publishedPages().map(lintPage);

  // One company, or an engine reading two of our pages finds two companies.
  const entities = new Map();
  for (const result of results) {
    if (!result.identity) continue;
    if (!entities.has(result.identity)) entities.set(result.identity, []);
    entities.get(result.identity).push(result.page);
  }
  if (entities.size > 1) {
    const variants = [...entities.values()].sort((a, b) => b.length - a.length);
    const majority = variants[0];
    for (const pages of variants.slice(1)) {
      for (const page of pages) {
        const target = results.find((r) => r.page === page);
        target.errors.push(
          `Organization entity differs from the ${majority.length} pages that agree ` +
            `(for example ${majority[0]}). One company, one entity.`
        );
      }
    }
  }

  const errors = results.reduce((n, r) => n + r.errors.length, 0);
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0);

  if (asJson) {
    console.log(JSON.stringify({ pages: results.length, errors, warnings, results }, null, 2));
  } else {
    console.log(`[geo-lint] ${results.length} published page(s)`);
    for (const result of results) {
      if (!result.errors.length && !result.warnings.length) continue;
      console.log(`\n  ${result.page}`);
      for (const message of result.errors) console.log(`    x ${message}`);
      for (const message of result.warnings) console.log(`    ! ${message}`);
    }
    console.log(
      `\n[geo-lint] ${errors} error(s), ${warnings} warning(s)` +
        (errors ? '' : '. Nothing blocking.')
    );
  }

  process.exit(errors ? 1 : 0);
}

main();
