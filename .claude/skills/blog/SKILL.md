---
name: blog
description: >
  Write and publish one plumcut field note end to end: pick a subject from the
  Notion meetings or from search, write it, review it, build, push to main,
  verify it is live, and log the row in Notion. No approval step. Use when the
  user says "write a blog", "publish a post", "new field note", "blog", "ship a
  post", or asks for blog content for plumcut.
user-invocable: true
argument-hint: "[optional subject or question to write about]"
---

# Write and publish one plumcut field note

This is the manual version of the scheduled `plumcut blog` run. Same procedure,
same safeguards, invoked by a human instead of a cron.

## The procedure lives in the repo, not here

**Read `blog/tasks/author.md` and follow it exactly.** That file is the single
source of truth and the scheduled routine reads the same file. It holds the
subject rules, the meeting privacy rules, the review gate and several hard-won
warnings that will bite you if you skip them. Do not work from this page alone.

## How an argument changes the run

**No argument:** follow the runbook from Step 1. Read the control page, mine the
meetings since the watermark, pick the subject yourself.

**A subject or question given:** skip the mining in Step 3 and treat what the
user gave you as the candidate subject. Everything else is unchanged. You still
run the three questions on it, still check overlap against every existing row and
post, and still have to find what people actually ask around that subject rather
than answering the phrasing you were handed.

A given subject does not override the control page. If `Paused` is `yes`, stop
and tell the user the blog is paused rather than publishing around the switch.

## The review gate is real

Step 6 can kill the post, and it should when a claim cannot be verified honestly.
Deleting the file and logging a `killed` row is the correct outcome, not a failed
run. Never soften a claim just enough to keep the run productive, and never ask
the user to approve past a failed check. Publishing nothing is cheap.

## Verify before you claim it shipped

Run `node scripts/verify-blog.js <slug>` after pushing, every time. A landed
commit and a stale HTTP 200 both prove nothing. If the network blocks
plumcut.com, use the documented deployment API fallback, or report
`pushed, deployment unverified` and leave the row for the next run to confirm.
