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
 *   GEMINI_API_KEY=... node scripts/ai-visibility.js --no-search
 *   node scripts/ai-visibility.js --list                        # print prompts
 *
 * Free tier is roughly 20 requests per day per model, so one full 13 prompt
 * run per day fits with room to spare. The allowance is per model, so a second
 * run the same day can use GEMINI_MODEL=gemini-3.1-flash-lite, at the cost of
 * comparing two models rather than trending one.
 *
 * Free Search grounding is attached to gemini-2.5-flash, but Google has been
 * reported to withhold it from newer accounts. If a run fails on grounding
 * quota, --no-search drops the tool and asks the model cold. That measures
 * something different and weaker, whether we exist in the model's trained
 * knowledge rather than whether we get retrieved and cited, but it is free
 * everywhere and still worth trending.
 *
 * Writes a timestamped JSON run to blog/tasks/ai-visibility/ so scores can be
 * compared over time. Zero dependencies, same as the blog builder.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// gemini-2.5-flash is closed to accounts created after late 2025, which is
// also where the free grounding allowance lived. Override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// The free tier allows only a few requests per minute. Pacing costs a minute
// of wall clock and avoids spending the daily allowance on 429s.
const PACE_MS = Number(process.env.PACE_MS || 4000);
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

/*
 * Who gets named when we do not. This is the actionable half: a list of the
 * brands an engine reaches for on our own buyer questions. Add names as they
 * show up rather than guessing at a definitive market map.
 */
const RIVALS = [
  'Wati', 'respond.io', 'Interakt', 'Twilio', '360dialog', 'Gupshup', 'Zoko',
  'SleekFlow', 'Infobip', 'Yalo', 'Charles', 'Trengo', 'ManyChat', 'Tidio',
  'Zendesk', 'Freshchat', 'Intercom', 'Chatfuel', 'Landbot', 'Botpress',
  'AiSensy', 'DoubleTick', 'Periskope', 'Limechat', 'Verloop', 'Haptik',
  'Yellow.ai', 'Unifonic', 'Clickatell', 'MessageBird', 'Sinch', 'BotSpace',
  'Kanal', 'Flowcart', 'GetGabs', 'TextYess', 'Alhena', 'eGrow',
  // Surfaced by the first baseline run rather than guessed at. Rasayel is
  // the one to watch: the model already describes it as the MENA-native
  // option, which is the position plumcut is arguing for.
  'Rasayel', 'LimeChat', 'BiteSpeed', 'Chatarmin', 'Bitespeed', 'Delightchat', 'Gallabox',
];

function rivalsIn(text) {
  const t = String(text).toLowerCase();
  return RIVALS.filter((n) => t.includes(n.toLowerCase()));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function flatten(sets) {
  return sets.flatMap((name) => PROMPTS[name].map((text) => ({ set: name, text })));
}

async function ask(prompt, grounded, attempt = 0) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(grounded ? { tools: [{ google_search: {} }] } : {}),
    }),
  });
  if (!res.ok) {
    // 503 means the shared free pool is busy, not that the prompt is bad.
    if (res.status === 503 && attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return ask(prompt, grounded, attempt + 1);
    }
    const body = await res.text();
    // A 429 carries the quota it broke. Reporting "quota exceeded" without the
    // number sends the reader to a dashboard to learn what the response said.
    let detail = body.slice(0, 200);
    try {
      const d = JSON.parse(body);
      const v = (d.error?.details || []).flatMap((x) => x.violations || [])[0];
      const wait = (d.error?.details || []).find((x) => x.retryDelay)?.retryDelay;
      if (v) detail = `${v.quotaId} = ${v.quotaValue}${wait ? `, retry in ${wait}` : ''}`;
    } catch {}
    throw new Error(`${res.status} ${detail}`);
  }
  const data = await res.json();
  const cand = (data.candidates || [])[0] || {};
  const answer = (cand.content?.parts || []).map((p) => p.text || '').join('');
  // Grounding chunks carry the pages the model actually read. The uri is a
  // Google redirector, so the title is the only readable source label.
  const cited = (cand.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web?.title || '')
    .filter(Boolean);
  const queries = cand.groundingMetadata?.webSearchQueries || [];
  return { answer, cited: [...new Set(cited)], queries, rivals: rivalsIn(answer) };
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

  const grounded = !args.includes('--no-search');
  let quotaStop = false;
  if (!grounded) console.log('running without Google Search grounding');

  const results = [];
  for (const p of prompts) {
    process.stdout.write(`[${p.set}] ${p.text.slice(0, 58)}... `);
    try {
      const { answer, cited, queries, rivals } = await ask(p.text, grounded);
      const mentioned = BRAND.test(answer);
      results.push({ ...p, mentioned, cited, queries, rivals, answer });
      console.log(`${mentioned ? 'MENTIONED' : 'absent'}${rivals.length ? '  (' + rivals.slice(0, 4).join(', ') + ')' : ''}`);
      await sleep(PACE_MS);
    } catch (err) {
      results.push({ ...p, error: String(err.message) });
      console.log('ERROR ' + err.message.slice(0, 80));
      if (err.message.startsWith('429')) {
        // The daily free allowance is spent. Every remaining prompt fails the
        // same way, and a wall of identical errors reads like a broken tool.
        quotaStop = true;
        console.log('  free allowance spent for today. Partial run saved, continue tomorrow,');
        console.log('  or set GEMINI_MODEL to another model for a fresh per-model allowance.');
        if (grounded) console.log('  if that was the grounding quota, retry with --no-search');
        break;
      }
    }
  }

  const ok = results.filter((r) => !r.error);
  const hits = ok.filter((r) => r.mentioned).length;
  const domains = {};
  for (const r of ok) for (const c of r.cited) domains[c] = (domains[c] || 0) + 1;

  console.log(`\nvisibility: ${hits}/${ok.length} prompts mentioned plumcut${quotaStop ? ' (partial run)' : ''}`);
  const rivalCount = {};
  for (const r of ok) for (const n of r.rivals || []) rivalCount[n] = (rivalCount[n] || 0) + 1;
  const board = Object.entries(rivalCount).sort((a, b) => b[1] - a[1]);
  if (board.length) {
    console.log('\nnamed instead of plumcut:');
    board.slice(0, 15).forEach(([n, c]) => console.log(`  ${String(c).padStart(2)}x  ${n}`));
  }

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
    JSON.stringify(
      { model: MODEL, grounded, partial: quotaStop, date: new Date().toISOString(), hits, total: ok.length, results },
      null,
      2
    )
  );
  console.log(`\nsaved ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
