# Buttons-at-end evidence — PR #36 @ 9dc6b95

Contract rule: **"Place buttons in tab content always at end of content."**
Every action button that sat at the TOP of a content block (above the content
it acts on) moved to the END of that block, matching the design spec's
config-tab reference render where the primary action closes the tab content
("ending in its own Save"). The per-subscription **Delete** stays inline-right —
a leaf record row whose action is already its trailing element (spec's
Connections-tab per-row convention).

## How produced (real surface, authenticated full-host boot)

- Host: cinatra monorepo dev server (`pnpm dev`, Next.js 16 / Turbopack,
  `CINATRA_RUNTIME_MODE=development`) on port 3210, in-tree extension checked out
  to the PR head for AFTER and to the pre-fix parent for BEFORE (release pins
  restored afterward).
- Route: `/connectors/cinatra-ai/wordpress-assistant-connector/setup`, driven
  with headless Chromium as a seeded **platform admin** ("PR36 Render Admin",
  visible in the full-page shots). One WordPress instance (`localhost:8080`) is
  wired, so the MCP/Webhooks tabs render a per-instance record with real actions.
- The Credentials tab is not included here because its live render shows a
  dev-generated API key / webhook secret; its change is proven by the
  measurements below instead.

## Measured button positions (viewport-relative `getBoundingClientRect`, light)

| Tab | Button | BEFORE (top of content) | AFTER (end of content) |
|---|---|---|---|
| Credentials | Regenerate credentials | top **227**, left 863 (top-right, above fields) | top **665** / bottom 697, left **464** (below fields, flush-left; == panel bottom 697) |
| MCP | Add MCP server | top **227**, left 897 (top-right, above list) | top **497** / bottom 535, left **464** (below instance list; == panel bottom 535) |
| Webhooks | Register webhooks | top **368**, left 884 (card header, above subs) | top **572** / bottom 600, left 481 (end of card, below the subscription rows) |
| Webhooks | Delete (per subscription) | inline-right (left 949) | inline-right (left 949) — **unchanged** |

In every tab the tab-content left edge (464) stays coincident with the page
header left edge (flush-left, `max-w-xl`), unchanged by this move.

## Files

`{before,after}-{crop,full}-{mcp,webhooks,help}-{light,dark}.png` — the MCP,
Webhooks and Help tabs, before/after, both themes. `crop-*` is the tab-content
region; `full-*` is the whole authenticated page.
