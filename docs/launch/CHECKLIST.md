# Launch checklist

Sequenced plan. Ready-to-post copy lives next to this file: [show-hn.md](show-hn.md), [reddit-r-selfhosted.md](reddit-r-selfhosted.md), [product-hunt.md](product-hunt.md), [awesome-selfhosted.md](awesome-selfhosted.md). All drafts are updated for the one-command Docker install.

## Phase 0: pre-launch gate (do all before posting anywhere)

- [ ] **Smoke test the one-command install on a clean machine.** curl the standalone compose, `docker compose up -d`, seed, log in, create an expense. This is the single highest-risk item: launch traffic lands directly on it.
- [ ] **Revive the commit graph.** Last visible activity should be days old, not months. Land a week or two of real commits before the first post; visitors check this before starring.
- [ ] **Cut a release** (v0.2.0) so the releases page does not show only June's v0.1.0, and so `VESKA_TAG` pinning has something current.
- [ ] **Label 10-15 `good first issue` / `help wanted` issues.** Plugin requests are ideal (the README already pitches plugins as the contribution path).
- [ ] **Set the repo social preview image** (Settings > General) to the banner, so HN/Reddit link previews look intentional.
- [ ] **Verify demo.gif shows the current UI** and the README renders cleanly on GitHub mobile.
- [ ] **Prepare answers for the predictable questions:** why not Odoo/ERPNext/Twenty; what data goes to Anthropic (answer: nothing, with Ollama); AI running cost per month; what happens when the AI mis-books an expense (answer: approval chains + audit log); single-maintainer bus factor.
- [ ] Post from your personal accounts. On HN especially, a fresh account with zero history gets flagged; if your account is new, spend a week commenting normally first.

## Phase 1: r/selfhosted (friendliest audience, lowest stakes)

- [ ] Post [reddit-r-selfhosted.md](reddit-r-selfhosted.md) on a weekday, 9-11am US Eastern.
- [ ] Reply to every comment the first day, including the hostile ones, with the same honesty as the post.
- [ ] Fold the best objections back into the README/FAQ and into the Show HN draft.
- [ ] Same week: submit to selfh.st (their new-software form) and add a listing on alternativeto.net (as alternative to Odoo, ERPNext, Zoho One).

## Phase 2: Show HN (about a week later, with Reddit lessons applied)

- [ ] Post [show-hn.md](show-hn.md) Tuesday-Thursday, 8-10am US Eastern, as a Show HN with the repo URL and the text in the text field.
- [ ] Clear your calendar for the day. Launches are won in the comment thread, not the post.
- [ ] Never ask anyone to upvote, and don't share the direct post link asking for support (HN's voting-ring detector penalizes this). Sharing "I posted on HN today" without the link is fine.
- [ ] If it does not take off, that's normal; a second Show HN of a later version months later is allowed and often does better.

## Phase 3: awesome-selfhosted (any time after Phase 1)

- [ ] Open the PR per [awesome-selfhosted.md](awesome-selfhosted.md). Slow burn, but it is the biggest long-tail discovery channel for this category.

## Phase 4: Product Hunt (only once there is some traction to show)

- [ ] Record a 30-60s walkthrough video (describe company > AI configures > expense via Slack > approval).
- [ ] Launch per [product-hunt.md](product-hunt.md): 12:01am Pacific, Tuesday-Thursday.
- [ ] Line up early users beforehand to comment with real usage stories (comments weigh more than upvotes).

## Ongoing (after Phase 1)

- [ ] X/LinkedIn thread with the demo gif on each launch day.
- [ ] "Open source alternative to Odoo / Zoho One" comparison page on hub.arunrajiah.com; listicles and SEO find you through this phrasing.
- [ ] Answer every new GitHub issue within 24h for the first month; early responsiveness is what converts a visitor into a contributor.
- [ ] A hosted live demo instance is the next big conversion lever once launch traffic proves demand.
