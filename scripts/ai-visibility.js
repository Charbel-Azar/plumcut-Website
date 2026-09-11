#!/usr/bin/env node
/**
 * Free AI visibility check.
 *
 * Asks an answer engine the questions our buyers actually ask, then records
 * whether plumcut was mentioned and which domains were cited. This is the half
 * a paid tracker charges for; the on-page half is `geo audit`, which is free
 * and needs no key at all (see blog/tasks/editorial.md).
 *
 * Runs on the Gemini API free tier, which includes Google Search grounding.
 * Get a key at https://aistudio.google.com/apikey, no card required:
 *
 *   GEMINI_API_KEY=... node scripts/ai-visibility.js
 *   GEMINI_API_KEY=... node scripts/ai-visibility.js --arabic   # Arabic set only
 *   node scripts/ai-visibility.js --list                        # print prompts
 *
 * Writes a timestamped JSON run to blog/tasks/ai-visibility/ so scores can be
 * compared over time. Zero dependencies, same as the blog builder.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const KEY = process.env.GEMINI_API_KEY || '';
const OUT_DIR = path.join(__dirname, '..', 'blog', 'tasks', 'ai-visibility');

/*
 * Unbranded buyer questions. Never mention plumcut in a prompt: the point is to
 * find out whether we surface unprompted. Keep these stable between runs, or
 * the comparison is meaningless. The Arabic and Arabizi sets are the ones no
 * off-the-shelf tracker ships, and the ones we most need to win.
 */
const PROMPTS = {
  english: [
    'What is the best WhatsApp AI automation for a Shopify store in Lebanon or the Gulf?',
    'Who offers a managed WhatsApp AI agent for ecommerce in the MENA region?',
    'How do I automatically answer "where is my order" on WhatsApp?',
    'Can I send WhatsApp abandoned cart messages, and what are Meta rules?',
    'What does the WhatsApp Business API cost in Lebanon, UAE and Saudi Arabia?',
    'Which WhatsApp automation tool handles Arabic and Arabizi properly?',
    'Should a small MENA online store automate WhatsApp, and what first?',
  ],
  arabic: [
    'ما هي أفضل أداة ذكاء اصطناعي للرد على عملاء المتجر عبر واتساب في السعودية؟',
    'كم تكلفة واتساب بزنس API في الإمارات والسعودية؟',
    'هل يمكن إرسال رسائل السلة المتروكة على واتساب؟',
    'أبحث عن شركة تدير الردود الآلية على واتساب لمتجري الإلكتروني',
  ],
  arabizi: [
    'shu ahsan tool la automation 3a whatsapp la online store bi lebnen?',
    'kif fike jaweb 3a "wen talabi" 3a whatsapp automatic?',
  ],
};

const BRAND = /\bplum ?cut\b|\bplumcut\.com\b/i;

function flatten(sets) {
  return sets.flatMap((name) => PROMPTS[name].map((text) => ({ set: name, text })));
}

async function ask(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const cand = (data.candidates || [])[0] || {};
  const answer = (cand.content?.parts || []).map((p) => p.text || '').join('');
  // Grounding chunks carry the pages the model actually read. The uri is a
  // Google redirector, so the title is the only readable source label.
  const cited = (cand.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web?.title || '')
    .filter(Boolean);
  const queries = cand.groundingMetadata?.webSearchQueries || [];
  return { answer, cited: [...new Set(cited)], queries };
}

async function main() {
  const args = process.argv.slice(2);
  const sets = args.includes('--arabic')
    ? ['arabic', 'arabizi']
    : args.includes('--english')
      ? ['english']
      : ['english', 'arabic', 'arabizi'];
  const prompts = flatten(sets);

  if (args.includes('--list')) {
    for (const p of prompts) console.log(`[${p.set}] ${p.text}`);
    return;
  }
  if (!KEY) {
    console.error('Set GEMINI_API_KEY. Free key: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  const results = [];
  for (const p of prompts) {
    process.stdout.write(`[${p.set}] ${p.text.slice(0, 58)}... `);
    try {
      const { answer, cited, queries } = await ask(p.text);
      const mentioned = BRAND.test(answer);
      results.push({ ...p, mentioned, cited, queries });
      console.log(mentioned ? 'MENTIONED' : 'absent');
    } catch (err) {
      results.push({ ...p, error: String(err.message) });
      console.log('ERROR ' + err.message.slice(0, 80));
    }
  }

  const ok = results.filter((r) => !r.error);
  const hits = ok.filter((r) => r.mentioned).length;
  const domains = {};
  for (const r of ok) for (const c of r.cited) domains[c] = (domains[c] || 0) + 1;

  console.log(`\nvisibility: ${hits}/${ok.length} prompts mentioned plumcut`);
  console.log('\nmost cited sources:');
  Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([d, n]) => console.log(`  ${String(n).padStart(2)}x  ${d}`));

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${stamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ model: MODEL, date: new Date().toISOString(), hits, total: ok.length, results }, null, 2)
  );
  console.log(`\nsaved ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
