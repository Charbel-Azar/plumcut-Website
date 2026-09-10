# plumcut repository instructions

Read CLAUDE.md for the site structure and copy rules. The same project rules
apply to every agent. Blog source is blog/posts/*.md; edit the generator or
Markdown, never generated blog HTML directly.

To write or publish a post, read blog/tasks/author.md and blog/tasks/editorial.md.
One run takes a post from subject to live, and those are the shared GitHub
runbooks the scheduled agent uses; fetch the current version before a run.
There is no human approval step, so the review pass in the runbook is the only
gate and it may kill the post. Read the Blog control page first: a paused blog
stays paused. Never name, quote or point at anyone from a meeting. Do not invent
reviews, results or credentials.

Validate changes with node scripts/build-blog.js --check. For builder changes,
also run node --test scripts/blog.test.js. Rebuild tracked generated outputs with
node scripts/build-blog.js. Every push to main deploys the site through Vercel.
