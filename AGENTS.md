# plumcut repository instructions

Read CLAUDE.md for the site structure and copy rules. The same project rules
apply to every agent. Blog source is blog/posts/*.md; edit the generator or
Markdown, never generated blog HTML directly.

To write or publish a post, read blog/tasks/author.md and blog/tasks/editorial.md.
One run takes a post from subject to live; fetch the current version before a
run. There is no human approval step, so the review pass in the runbook is the
only gate and it may kill the post. Never name, quote or point at anyone from a meeting. Do not invent
reviews, results or credentials. A run ends in Notion, not at the push: add the
post's row to the Blog database under Online Presence / cowork - Blog, as
Step 10 of author.md describes.

Brand facts are locked. Do not reword or change them unless the founders ask;
the full list is under "Brand rules (locked)" in CLAUDE.md:
- One-liner (llms.txt, Organization JSON-LD, footer): "plumcut builds and runs an
  intelligent automation system on the channels a brand's customers already use
  — it answers, actively sells (upsell, cross-sell, booking), and reads across
  every interaction to show the owner what customers actually want."
- Short version (meta descriptions, package.json): "plumcut builds and runs an
  intelligent automation system that answers, sells and books, and shows owners
  what customers actually want."
- foundingDate 2025-12, location Lebanon.
- Organization sameAs: Instagram, LinkedIn, Facebook, Wikidata Q141633318,
  Crunchbase organization/plumcut.

Validate changes with node scripts/build-blog.js --check. For builder changes,
also run node --test scripts/blog.test.js. Rebuild tracked generated outputs with
node scripts/build-blog.js. Every push to main deploys the site through Vercel.
