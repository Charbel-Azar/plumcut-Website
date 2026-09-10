# Task: blog author

**Run by:** the scheduled cloud routine `plumcut blog`, Mon / Wed / Sat.
**Job:** pick a subject, write one post, review it hard, publish it, verify it,
and log what happened in Notion.
**One run publishes at most one post.** Publishing nothing is a valid run.

This file is the procedure. The routine prompt is only a pointer to it, so
changing this file changes what the next run does. No API call, no routine edit.
Commit a change here and it is live.

It replaces the old split between a writer run and a publisher run. There is no
human approval step any more. What replaces it is Step 6, a real review pass with
the authority to throw the post away, plus the Paused switch on the control page
and the fact that a bad post is one `git revert` from gone.

---

## Constants

| | |
| --- | --- |
| Control page | https://app.notion.com/p/3d78d6e734f481298d03e96918155768 |
| Notion Blog data source | `collection://0f269a5b-550b-4e9e-b34d-f4c4837be033` |
| Notion Meetings data source | `collection://fd9c0e54-8bb3-47f4-bd2e-fd240acfef2f` |
| Operating manual (editorial standards) | https://app.notion.com/p/3d28d6e734f481759adad61d2925733d |
| Branch | `main`, deployed by Vercel |

> `Status` on the Blog database is a Notion **select**, not a **status**.
> Filtering it as a status silently returns zero rows and makes the run think the
> database is empty. Query it as a select, or use SQL mode.
>
> `Status` on the Meetings database really is a **status**. They are different.

---

## Step 1. Read the control page

Read it before anything else.

**Paused is `yes`:** stop. Write nothing, publish nothing, touch no file. Report
that the blog is paused. That is a success.

**Paused is `no`:** carry on. Hold on to two values for later:

- **Focus.** Empty means pick your own subject. Filled means every topic you
  consider has to serve that subject, and you say so in the run log.
- **Meetings read up to.** The watermark date for Step 3.

If the control page cannot be read at all, stop and report it. Do not guess the
switches. A run that cannot see the Paused switch has no right to publish.

### The cadence gate

The runbook sets the pace, not the routine's schedule. More than one routine may
fire in a week, and the same one may fire twice; this gate is what keeps the
output steady regardless.

Count the files in `blog/posts/` whose date is in the current week, Monday to
Sunday, and the ones dated today.

- **A post already dated today:** stop. One post a day, never two.
- **Three or more posts already dated this week:** stop. Three a week is the
  cadence.

Either way, write nothing, report which gate closed, and exit. That is a
success. A quiet run costs seconds; two posts in a day costs the section's
credibility.

**The gate binds the scheduled run, not a person.** It exists to pace an
unattended routine. When a human asks for a post directly, through `/blog` or in
so many words, the gate does not apply: write the post, and say in the run log
that a person asked for it outside the cadence. Everything else in this runbook
still applies to that run, the review pass above all.

## Step 2. Read before writing

The repo is checked out for you. Read all of these:

- `CLAUDE.md`, the house copy rules.
- `blog/tasks/editorial.md`, the topic, promotion, review and measurement rules.
  These maintained project rules override imported SEO heuristics.
- `blog/posts/_TEMPLATE.md`, the exact front matter shape.
- `blog/ART-DIRECTION.md`, what a hero may and may not show.
- The **Notion operating manual** linked above, for archetypes and voice. It
  supplements the repo rules. If it is unreachable, say so in your report and
  carry on with the repo rules.

Then read **every row in the Blog database**, whatever its status, and list
`blog/posts/*.md`. You need both to know what has already been said, drafted,
published or killed. Nothing you write may repeat one of them.

## Step 3. Mine the meetings

Query the Meetings data source for rows whose `Date` is after the watermark,
**all categories**, newest first. Read the `Notes` property and open the page body
of each one. Meeting bodies are where the real content is.

You are looking for the **subject underneath the conversation**, never the
conversation. A room where someone spent twenty minutes on why their delivery
partner keeps losing orders is not a story about that person. It is a signal that
order handoff to couriers is a subject buyers are hurting about right now.

For each subject you find, ask the three questions in order:

1. **What is the subject?** Say it in one plain line.
2. **What do people actually ask around it?** Search the web for the real
   questions people type about that subject. This is the step that turns a
   private room into a public post. The meeting tells you *what area to look in*,
   the search tells you *what question to answer*.
3. **How does plum help with that?** If there is no honest answer, the subject is
   not for us. Drop it and take the next one.

A subject that passes all three becomes the candidate. If Focus is set on the
control page, only subjects serving that focus qualify.

**Nothing usable in the meetings, or no meetings since the watermark:** fall back
to web search alone, weighted to MENA and Gulf commerce brands, staying inside
the subject range in editorial.md. A run that falls back is normal, not a
failure. Say so in the report.

Whatever happens, move the watermark forward at the end of the run.

### What must never leave a meeting

Hard rules, no exceptions, whatever the subject turns out to be.

- **Never name a company, a person or a product** you heard about in a room.
- **Never quote a meeting**, in full or in paraphrase close enough to recognise.
- **Never describe a specific deal**, its price, its terms or its state.
- **Never write a sentence that starts "a client told us"** or any variant. Even
  unnamed, it points at a real conversation.
- **Never link a meeting page** in anything that reaches the repo or the site.

The public post carries the answered question and nothing else. The link back to
the room lives in the Notion row, which is internal, and there only.

If you cannot write the post without leaning on something specific you heard,
you have picked the wrong subject. Take the next one.

### Network reality

This sandbox enforces an egress allowlist. `suggestqueries.google.com` and
`reddit.com` are blocked, and so is direct fetching of `developers.facebook.com`.
Do not burn turns retrying them. Use the **WebSearch tool**, with domain-filtered
searches via `allowed_domains` when you need a primary source.

## Step 4. Settle the topic

Before writing, write down for yourself:

- The question, in the words a person would type it.
- Who the reader is.
- Where the subject came from: which meeting, or which search.
- What this adds that the existing posts do not.
- Which plumcut page it should send the reader to.

Then check overlap one more time against every row and every published post. If
an existing article already answers this question, do not write a near-duplicate.
Either propose a refresh of that article in your report and stop, or take the
next candidate subject.

Follow the long-term mix in editorial.md, roughly 60% practical guides, 25%
comparisons and buying decisions, 15% direct product articles. It is a planning
guideline over months, not a quota that justifies a weak post this run.

## Step 5. Write it

Use the length the question needs. Do not pad a complete answer.

1. **Opening**, 2 to 4 sentences naming the reader's real problem. No throat
   clearing.
2. **A direct answer**, optionally a markdown blockquote after the opening,
   answering the question on its own.
3. **Body** in `##` sections. Tables where they help, verified specifics,
   practical examples. Label every hypothetical as hypothetical.
4. **A closing section** telling the reader what to do this week.
5. **FAQ questions** only where they add a real answer. No fixed count.

Verify every factual claim against a primary source as you go. Meta and Google
docs beat blog posts. Third-party blogs contradict each other constantly.

Include 2 to 4 in-body internal links to `/solutions`, `/how-it-works`,
`/pricing`, or blog posts that already exist. Clean URLs, no `.html`. Choose 2 to
3 genuinely related existing slugs and a specific ctaLine that connects this
subject to what plum does.

Write the post as `blog/posts/YYYY-MM-DD-<slug>.md` with today's date, following
`_TEMPLATE.md` exactly. Keywords must be a YAML list. Omit optional fields you do
not have. Never invent an author or claim a person reviewed an automated draft.

### The hero image

**Do not fetch images.** Every image host is blocked in this sandbox. That is why
`blog/heroes/` exists.

Read `blog/heroes/manifest.json`, match its `tags` against the subject, and take
the best fit, preferring one a recent post has not used. Copy `file`, `alt`,
`credit`, `creditUrl`, `source`, `license` and `licenseUrl` into the front matter
verbatim. Attribution is a licence condition, not a courtesy. Reuse across posts
is fine and expected. Nothing fits, leave the hero fields empty and say so.
**Never invent an image URL.**

## Step 6. Review it, with the power to kill it

This step replaces the human approval gate. Treat it that way. Read the post
again as a stranger who wants to catch you out, not as the person who wrote it.

Check all of it:

- **Every changeable claim** re-verified against a primary source, with the date
  you checked it. Prices, plan names, API limits and policies move constantly.
  Cannot verify it, qualify it or cut it.
- **Every competitor assertion** fair, current, and judged on the same criteria
  you judged plum on. Say plainly where an alternative fits better. Disclose that
  plumcut publishes comparisons featuring itself.
- **The title's question actually answered**, in the body, not just gestured at.
- **No contradiction** between the body, the FAQ and any existing published post.
- **Every internal link resolves** to a page or post that exists today.
- **The FAQ wording identical** in the visible content and the schema.
- **House rules:** no em or en dashes, no Arabic script, plumcut and plum always
  lowercase, never "AI agent" or "AI system", WhatsApp not Instagram, no invented
  statistic, case study, customer or testimonial.
- **The leak check.** Read it once more asking only: could anyone who was in that
  room recognise themselves here? Any yes at all fails.

Fix what can be fixed. **If something cannot be fixed honestly, kill the post.**
Delete the markdown file, create the Notion row with `Status = killed` and the
truest `Kill reason`, log it, and stop. Do not publish a weakened version to
avoid an empty run. An empty run costs nothing. A wrong post on plumcut.com costs
the thing the whole site is for.

## Step 7. Build

Start from a clean checkout of `main`, fetched and fast-forwarded. On a detached
HEAD, use a clean branch based on `origin/main`. Never reset or overwrite other
work. Cannot synchronise safely, stop and report it.

```bash
node scripts/build-blog.js --check   # renders and validates, writes nothing
node scripts/build-blog.js           # writes
```

Fix any conversion error, broken internal link, invalid metadata or FAQ mismatch
before going further. Read the warnings. A short complete answer is fine and
should not be padded to clear a word count.

## Step 8. Commit and push

Vercel runs the builder itself, per `vercel.json`. Commit the markdown source.
Generated outputs already tracked in git must stay consistent and be committed;
do not start tracking new generated article HTML unnecessarily.

Inspect the staged diff. Include no unrelated files. Name the article in the
commit message.

Push to `main`. If rejected, fetch and rebase only this run's own commit onto
`origin/main`, rebuild, revalidate, retry once. Resolve mechanical conflicts
only. **Never force push.** Confirm the commit is on remote `main`.

## Step 9. Verify it is really live

```bash
node scripts/verify-blog.js <slug>
```

This checks HTTP 200, the canonical URL, the content-version marker against your
local build, and the sitemap entry. A stale 200 is not proof of anything, and a
landed commit is not proof of anything. Deployment pending, retry at short
intervals for up to two minutes.

If this environment blocks plumcut.com, use an available Vercel connector or API
to confirm a successful production deployment of the commit. Do not read a
network block as a failed deployment. Neither route available, report
`pushed, deployment unverified`, write the Notion row as `approved` rather than
`published`, and let the next run verify it without republishing.

## Step 10. Write the row and the log

One Notion row per post, created after verification, not before.

Properties: `Status = published`, Title, Slug, Question, Description, Type,
Keywords, Words, all seven Hero fields, `Source` (`meeting` when a room started
it, otherwise `web search`), `Published on` = today, `Live URL` =
`https://plumcut.com/blog/<slug>`.

Page body, in this order:

1. `## Publishing metadata`, a fenced JSON object with `related`, `ctaLine`, and
   any verified `author`, `authorUrl`, `reviewedBy`, `reviewerUrl`.
2. `## Where this came from`. The subject in one line, the meeting page link if
   there was one, the questions you found around it, and why you chose this one.
   **This section is internal and stays in Notion. None of it reaches the repo.**
3. `## Review record`. Sources checked with the date you checked them, what you
   verified, what you qualified or cut, anything still open. State plainly that
   review was automated, and never write a human's name as a reviewer.
4. The hero as `![alt](https://plumcut.com/blog/heroes/<file>.jpg)`, absolute so
   Notion renders it, then the credit line.
5. `---`, then the post, then `## FAQ` if used.

Set the page cover to the same absolute URL.

Then, on the **control page**:

- Move **Meetings read up to** forward to the newest meeting date you read.
- Add one line at the top of the Run log:
  `- Sat 13 Sep 2026, ok, <slug>, from a meeting on <date>.`
  Use `killed` and the reason instead of `ok` when Step 6 killed the post, or
  `nothing` when no subject passed.

## Never

- Publish more than one post in a run.
- Publish anything that failed Step 6.
- Force push, or hand-edit anything under `blog/*.html`.
- Invent a statistic, a case study, a customer, an author or a reviewer.
- Name, quote or point at anyone from a meeting.
- Claim a verified deployment on the strength of a git push.

## Finish

Report: the subject and where it came from, the question you answered, the slug
and live URL, the verification result, the hero you used, anything you qualified
or cut in review, and any warning still standing. If the run killed the post or
found nothing, say that instead, and say why.

---

## How the routine is set up

The scheduled routine is a pointer, nothing more. It lives in the claude.ai
Routines UI, not in this repo, because a routine's connectors and repo source can
only be set there. If it ever needs rebuilding, these are the settings.

| | |
| --- | --- |
| Name | `plumcut blog` |
| Schedule | `12 6 * * 1,3,6` — Mon, Wed, Sat at 06:12 UTC, 09:12 Beirut |
| Environment | Nour, `env_014UaKLuxzeHhyuTpUk5q4r3` |
| Model | Opus 5 |
| Source | `github.com/Charbel-Azar/plumcut-Website`, branch `main` |
| Connector | Notion. **Without it the run cannot read the control page, mine the meetings or log the row.** |
| Tools | Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch |
| Notifications | on, so a published post is not a silent event |

The prompt:

> You are the AUTHOR for the plumcut blog. One run, one post, from subject to
> live.
>
> Read `blog/tasks/author.md` in the checked-out repo and follow it exactly. It
> is the full procedure and the single source of truth for this run; anything you
> remember about this job is secondary to what that file says today.
>
> If the file is missing or unreadable, STOP. Do not improvise a post from
> memory, do not publish, and do not push anything. Report that the runbook could
> not be read and exit.
>
> Step 1 of that runbook has you read the Blog control page in Notion before
> anything else. If it says Paused, stop there and write nothing. That is a
> success.
>
> When you are done, report what the runbook asks you to report.

## A known gap: verification is blocked

The sandbox's egress allowlist currently refuses `plumcut.com`, so Step 9 cannot
reach the live site and `verify-blog.js` fails with an HTTP 403 that has nothing
to do with the deployment. Until `plumcut.com` is added to the environment's
network allowlist, every run will fall through to the unverified path in Step 9
and leave its row at `approved` instead of `published`.

That is the safe behaviour, but it is not the intended one. Adding the domain to
the allowlist is a one-line environment change and it turns the last step of the
pipeline back on. Do it and the runbook needs no edit.
