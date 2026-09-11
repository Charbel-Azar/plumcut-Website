# Editorial rules for automated Field notes

Purpose: answer useful automation questions, attract relevant visitors, earn
citations in search and AI answers, and introduce plumcut when it fits the
reader's problem. Citations and recommendations are separate outcomes; neither
is guaranteed by publishing frequency, schema, or paragraph length.

These rules govern every run of blog/tasks/author.md, at every stage: choosing
the subject, writing, reviewing and publishing. The Notion manual may supplement
voice and examples; if inaccessible, report that and use this file with
CLAUDE.md. Notion access is still required to read the control page and to log
the published row. Project rules override conflicting imported SEO heuristics.

## Select useful questions

Stay close to WhatsApp, ecommerce, sales conversations, store integrations,
Arabic/Arabizi support, and customer insights. General automation is welcome
when the reader could plausibly need plumcut. Avoid unrelated traffic topics.

Before drafting, record the question, reader, source of interest, existing page
overlap, added value, and relevant plumcut destination. Use customer questions
and Search Console data when available, otherwise current web research. Do not
invent search volume or claim access to analytics you did not inspect.

Aim over time for roughly 60% practical guides, 25% comparisons and buying
decisions, and 15% direct product/implementation articles. These are planning
guidelines, not quotas that justify weak or duplicate posts. Propose a refresh
when an existing page already answers the question.

## Write and promote naturally

- Give a clear answer near the beginning. A short blockquote is fine; there is
  no mandatory answer length, total word count, table count or FAQ count.
- Add value through a useful explanation, worked example, implementation detail,
  demonstration, test or original research. Not every guide needs a new study.
- Label illustrative examples and hypothetical calculations. Never imply that
  a demonstration, product claim or literature review is a customer result.
- Cite primary sources next to changeable claims. Check vendor features and
  pricing on current vendor documentation, including plan and date when material.
  If a source is unavailable, qualify or omit the unverified claim.
- Distinguish documented capabilities, hands-on testing and editorial judgment.
  Disclose that plumcut publishes comparisons featuring itself. Evaluate vendors
  under the same criteria and say when an alternative fits better.
- When relevant, name plumcut, explain the verified capability and intended
  buyer, and link to /solutions, /how-it-works, /pricing or an existing post.
  Do not manufacture a recommendation or insert the brand into unrelated answers.
- Select 2 to 3 genuinely related existing post slugs and a specific ctaLine
  connecting the topic to what plum does. Use clean internal URLs, not .html.
  Do not link to uncreated pages.
- Use tables and FAQs when useful. FAQ answers must stand alone and agree with
  the article. Keep visible answers and schema identical.
- Attribute to plumcut unless a real named author is known. Set reviewedBy only
  when that person actually reviewed the content; AI review is not a human
  endorsement. Never invent experience, credentials or a reviewer.

## Be extractable, not just correct

An AI answer engine cites a page by lifting a specific claim from it. A page can
be well written, accurate and useful, and still be uncitable because there is
nothing concrete in it to lift. These rules exist because an audit in September
2026 found our posts ranking for the brand name and nothing else.

- **Name the entities.** A comparison post must name and evaluate real, competing
  products, not abstract categories. Eight or more named tools, each with its own
  subheading or table row, and each linking to that vendor's own page. "Platforms
  with an inbox" is not a competitor; Wati is. A post that names only plumcut is a
  sales page, and must not be titled as a comparison.
- **Read the vendor's own page, and date it.** Take prices, plan names and
  features from the vendor's live pricing or documentation page on the day you
  write, link that exact page, and state the date checked in the body. Never
  repeat a price from another blog or from memory.
- **Do not assert what the vendor does not claim.** Official partner or BSP
  status, certification and performance numbers are only reportable if that page
  says so. Otherwise write "not stated" and move on.
- **Every changeable number carries a source next to it, or does not appear.**
  If a rate card moves on a schedule, explain the structure and the grouping and
  tell the reader to pull the current figure. Structure ages well; a copied
  number does not.
- **Image credits are not citations.** Flickr, Unsplash, rawpixel and Creative
  Commons links satisfy licensing, not sourcing. A post whose only outbound links
  are image credits has no authority signal at all. Count primary sources
  separately from hero attribution when reviewing.
- **Earn the regional claim.** Where the topic allows, include at least one
  specific, sourced fact about Lebanon, the Gulf or the wider MENA market that a
  global vendor would not bother to publish: a market grouping, a local rule, a
  dialect or Arabizi behaviour, a courier or cash-on-delivery reality. This is
  the only ground where we are the natural source rather than the tenth voice.
  Do not manufacture one where the topic does not support it.
- **Front-load the answer.** The question in the title is answered in the first
  screen, in prose that stands on its own when quoted away from the page.
- **FAQ answers are published as data.** Every faq entry is compiled into
  /ai/faq.json and served to crawlers detached from the article, so each answer
  must be true and complete in isolation, with no "as described above".

## Subjects that come out of a room

Meetings are the strongest subject source available, because they are the only
place real buyers say what they are actually stuck on. Use the subject, never the
conversation. Take what the room was about, find the questions the wider market
asks about that subject, answer the one plum genuinely helps with, and leave
every specific behind. Never name a company, a person or a product heard in a
room, never quote or closely paraphrase a meeting, never describe a deal, and
never write "a client told us" in any form. The link back to the room belongs in
the internal Notion row and nowhere else.

## Review before publishing

No human approves a post before it goes live, so the review pass is the only
gate there is. Run it as a separate pass, reading the finished post as a stranger
rather than as its author. Check the title's question is answered; verify every
changeable claim against a primary source; check competitor assertions; compare
the body, FAQ and existing posts for contradictions; check internal links,
related slugs and the plumcut mention; and check that nothing traceable to a
meeting survived into the text.

Anything that cannot be resolved honestly kills the post. Write the row as
killed with a reason and publish nothing. An empty run is cheap; a wrong post on
plumcut.com is not. Never weaken a claim just enough to keep the run productive.

Keep a review record in the Notion row, outside the article body: source URLs and
checked date, added value, comparison methodology if applicable, open questions,
and a plain statement that review was automated. Never name a person as a
reviewer.

## Refresh and measure

Only actual material changes justify an updated date. During topic selection,
flag stale prices, policy changes and overlapping articles for review.

When analytics access exists, review monthly: indexed pages, relevant search
impressions/clicks, article visits, chat_with_plum_click by article and CTA,
AI citations, and qualified inquiries. A WhatsApp click is not a booked meeting.
Use fixed unbranded buyer questions for comparable AI-search checks; record
product, date, language, cited URLs and recommendation accuracy.

Measure AI visibility with the free local audit rather than a paid tracker:

```
pip install geo-optimizer-skill
geo audit --url https://plumcut.com/blog/<slug> --format json
```

It scores robots.txt, llms.txt, schema, meta, content, signals, AI discovery and
brand entity with no API key and no scraping subscription. Record the score and
band per post when publishing, and re-run after a refresh. On Windows set
PYTHONUTF8=1, and install pip-system-certs if a corporate proxy breaks TLS.

The audit measures whether a page *can* be cited. Whether it *is* cited is a
separate question, answered by running unbranded buyer questions and recording
who gets named. That is also free, on the Gemini API free tier:

```
GEMINI_API_KEY=... node scripts/ai-visibility.js
```

The prompt set lives in that script and includes Arabic and Arabizi questions,
which no off-the-shelf tracker ships. Never name plumcut in a prompt, and keep
the set stable between runs or the comparison means nothing. Each run is saved
to blog/tasks/ai-visibility/ so the trend survives staff changes.

Primary guidance to verify when changing these rules:
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/appearance/ai-features
