---
name: blog
description: >
  Write and publish plumcut field notes end to end: research the subject,
  write it, review it, build, push to main, verify it is live, add backlinks,
  and record the post in the Notion Blog database under Online Presence. Use
  whenever the user asks, in any wording, to write, draft, publish or ship a
  blog, post, article or field note, says "blog", "new field note", "write a
  blog about X", or asks for blog content for plumcut.
user-invocable: true
argument-hint: "[subject or question to write about]"
---

# Write and publish a plumcut field note

There is no scheduled routine and no control page. A person asks, you write,
publish, and record the post in Notion.

## Start by syncing the repo

Before reading anything, `git fetch origin` and fast-forward `main` (never reset
or overwrite local work; if it cannot fast-forward cleanly, stop and say so).

## The procedure lives in the repo, not here

**Read `blog/tasks/author.md` and follow it exactly.** It holds the subject
rules, the meeting privacy rules, the review gate and the Notion record. Do not
work from this page alone.

If no subject was given, propose a few and let the person pick before writing.

## The review gate is real

The review step can kill the post, and it should when a claim cannot be verified
honestly. Never soften a claim just enough to keep it publishable.

## Verify before you claim it shipped

Run `node scripts/verify-blog.js <slug>` after pushing, every time. A landed
commit and a stale HTTP 200 both prove nothing.

## Finish in Notion, every time

The job is done when the post has a row in the Notion `Blog` database
(`collection://0f269a5b-550b-4e9e-b34d-f4c4837be033`, under Brand & Identity /
Branding / Online Presence / cowork - Blog). That database is the history of
every post written, so a killed post gets a row too. If Notion is unreachable,
say so plainly and list the row's properties so it can be added by hand. Never
report success with the Notion step skipped.
