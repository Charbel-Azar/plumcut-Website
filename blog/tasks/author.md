# Task: blog author

**Run by:** a person asking Claude Code for a post, through `/blog` or in any
wording. There is no scheduled routine and no control page any more; both were
retired on 4 Oct 2026.
**Job:** take the subject you were given, write the post, review it hard,
publish it, verify it, and record it in the Notion Blog database.
Publishing nothing is a valid outcome when review kills the post.

This file is the procedure. Change it here and the next run follows it.

---

## Constants

| | |
| --- | --- |
| Notion Blog data source | `collection://0f269a5b-550b-4e9e-b34d-f4c4837be033` |
| Where it lives | Brand & Identity / Branding / Online Presence / cowork - Blog |
| Notion Meetings data source (optional subject source) | `collection://fd9c0e54-8bb3-47f4-bd2e-fd240acfef2f` |
| Branch | `main`, deployed by Vercel |

> `Status` on the Blog database is a Notion **select**, not a **status**.
> Filtering it as a status silently returns zero rows. Query it as a select, or
> use SQL mode.

---

## Step 1. Sync and read before writing

`git fetch origin` and fast-forward `main`. Never reset or overwrite local work;
if it cannot fast-forward cleanly, stop and say so.

Then read all of these:

- `CLAUDE.md`, the house copy rules.
- `blog/tasks/editorial.md`, the topic, promotion and review rules.
- `blog/posts/_TEMPLATE.md`, the exact front matter shape.
- `blog/ART-DIRECTION.md`, what a hero may and may not show.
- The **Editorial standards** section on the cowork - Blog page in Notion, for
  archetypes and voice. If it is unreachable, say so and carry on.

Then read **every row in the Blog database** and list `blog/posts/*.md`. Nothing
you write may repeat a post that already exists.

## Step 2. Settle the subject

Usually the person gives you the subject. If they do not, propose a few from
web search, or from the Meetings database if they ask for that, and let them
pick.

For the chosen subject, write down for yourself:

- The question, in the words a person would type it. Search for what people
  actually ask around the subject; do not just answer the phrasing you were
  handed.
- Who the reader is.
- What this adds that the existing posts do not.
- Which plumcut page it should send the reader to.

If an existing post already answers the question, say so and either narrow the
new post to a different question or propose refreshing the old one.

### If a subject came out of a meeting

Hard rules, no exceptions.

- **Never name a company, a person or a product** you heard about in a room.
- **Never quote a meeting**, in full or in close paraphrase.
- **Never describe a specific deal**, its price, its terms or its state.
- **Never write "a client told us"** or any variant.
- **Never link a meeting page** in anything that reaches the repo or the site.

The public post carries the answered question and nothing else.

## Step 3. Write it

Use the length the question needs. Do not pad a complete answer.

1. **Opening**, 2 to 4 sentences naming the reader's real problem.
2. **A direct answer**, optionally a blockquote, answering the question on its own.
3. **Body** in `##` sections. Tables where they help, verified specifics,
   practical examples. Label every hypothetical as hypothetical.
4. **A closing section** telling the reader what to do this week.
5. **FAQ questions** only where they add a real answer.

Verify every factual claim against a primary source as you go. Vendor prices
come from the vendor's own page, with the date checked in the body.

Include 2 to 4 in-body internal links to `/solutions`, `/how-it-works`,
`/pricing`, or existing blog posts. Clean URLs, no `.html`. Choose 2 to 3
related existing slugs and a specific ctaLine.

Write the post as `blog/posts/YYYY-MM-DD-<slug>.md` with today's date, following
`_TEMPLATE.md` exactly. Never invent an author or claim a person reviewed it.

**Hero image:** read `blog/heroes/manifest.json`, match `tags` to the subject,
prefer one recent posts have not used, and copy `file`, `alt`, `credit`,
`creditUrl`, `source`, `license` and `licenseUrl` into the front matter
verbatim. Never invent an image URL.

**Backlinks:** add a link to the new post from 1 to 3 genuinely related existing
posts, in a sentence that fits where it lands. Edit their markdown, never the HTML.

## Step 4. Review it, with the power to kill it

Read the post again as a stranger who wants to catch you out.

- **Every changeable claim** re-verified against a primary source, with the date.
  Cannot verify it, qualify it or cut it.
- **Every competitor assertion** fair and current. Disclose that plumcut
  publishes comparisons featuring itself, and say where an alternative fits better.
- **The title's question actually answered.**
- **No contradiction** with the FAQ or any existing post.
- **Every internal link resolves.**
- **House rules:** no em or en dashes, no Arabic script, plumcut and plum always
  lowercase, never "AI agent" or "AI system" for plum, WhatsApp not Instagram,
  no invented statistic, customer or testimonial.
- **The leak check** if anything came from a meeting.

Fix what can be fixed. **If something cannot be fixed honestly, kill the post**:
delete the markdown file, log a `killed` row in Notion with the truest
`Kill reason`, and tell the person why.

## Step 5. Build

```bash
node scripts/build-blog.js --check   # renders and validates, writes nothing
node scripts/build-blog.js           # writes
node scripts/geo-lint.js             # AI-readiness lint; an error blocks
```

## Step 6. Commit and push

Commit the markdown plus the generated outputs the build changed. Inspect the
staged diff, include nothing unrelated, name the article in the message. Push to
`main`. If rejected, fetch, rebase only your own commit, rebuild, retry once.
**Never force push.**

## Step 7. Verify it is really live

```bash
node scripts/verify-blog.js <slug>
```

Retry at short intervals for up to two minutes while Vercel deploys. Verify the
posts you added backlinks to as well. If plumcut.com cannot be reached, say
`pushed, deployment unverified` and log the row as `approved` instead of
`published`.

You do not need to ping search engines. The push triggers the `IndexNow`
GitHub workflow, which waits for the deploy and submits the new and changed
URLs to IndexNow automatically.

## Step 8. Record it in Notion

The run is not finished until this is done. One row per post in the Blog
database, created after verification. That database is the history of every
post written.

Properties: `Status = published`, Title, Slug, Question, Description, Type,
Keywords (comma separated), Words, the seven Hero fields, `Source`
(`web search`, `meeting` or `manual`), `Published on` = today, `Live URL` =
`https://plumcut.com/blog/<slug>`. Set the page cover to
`https://plumcut.com/blog/heroes/<file>.jpg`.

Page body:

1. `## Publishing metadata`, a fenced JSON object with `related` and `ctaLine`.
2. `## Where this came from`, the subject and why this question. Internal only.
3. `## Review record`, sources checked with the date, what was qualified or cut,
   and a plain statement that review was automated.
4. The hero image and credit line, then a pointer to the markdown file and the
   live URL.

If Notion is unreachable, say so plainly and list the row's properties so it can
be added by hand.

## Never

- Publish anything that failed Step 4.
- Force push, or hand-edit anything under `blog/*.html`.
- Invent a statistic, a case study, a customer, an author or a reviewer.
- Name, quote or point at anyone from a meeting.
- Claim a verified deployment on the strength of a git push.

## Finish

Report: each post's title and live URL, the verification result, the backlinks
added, anything qualified or cut in review, and confirmation that the Notion rows
exist.
