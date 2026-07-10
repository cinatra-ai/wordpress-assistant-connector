# PR #36 — current-head render gallery (head `9dc6b95`)

Replacement gallery for the connector setup page rendered at the **current PR
head `9dc6b95`** ("move tab-content action buttons to the end of their
content"). The earlier full-boot gallery on the PR was rendered at `0276f3f`,
before the two later commits (`dc9a035` left-align card-less Narrow content,
`9dc6b95` buttons-at-end), so it was stale for button placement and tab width.

## How produced (real surface, authenticated full-host boot)

- Host: an **isolated deep-fork clone** of the cinatra monorepo (own worktree,
  own clone database, own app port) — host-native Next.js 16 / Turbopack on
  port 3100, not the shared dev host. The connector was checked out **in-tree**
  to the PR head `9dc6b95` and workspace-compiled from source.
- Route: `/connectors/cinatra-ai/wordpress-assistant-connector/setup`, driven
  with headless Chromium at 1440×1400 @2×, signed in as a seeded **platform
  admin** ("PR36 Render Admin", visible in the full-page shots) with an active
  organization.
- One WordPress instance (`http://localhost:8080`) is wired (the per-instance
  model — instances live in the core WordPress connector), so the MCP and
  Webhooks tabs render a per-instance record with its action button. In this
  ephemeral local stack the WordPress REST/MCP endpoints are not reachable, so
  the per-instance status lines read their unreachable/empty states — this does
  not affect what is being evidenced here (the **action button sits at the END
  of its tab/card content**).
- The Credentials values shown are **freshly regenerated throwaway fixtures**
  minted in this ephemeral clone database (a `localhost` widget key + webhook
  secret with no real-world validity).

## What changed at head `9dc6b95` (buttons at end)

Every action button that sat at the TOP of a content block now sits at the END:

| Tab | Button | Placement at head |
|---|---|---|
| Credentials | Regenerate credentials | below the fields, flush-left (last element; bottom == panel bottom) |
| MCP | Add MCP server | below the per-instance list, flush-left |
| Webhooks | Register webhooks | closes the per-instance card, below the subscription area |
| Webhooks | Delete (per subscription) | inline-right — unchanged (leaf record row) |
| Help | — | read-only, no action button |

Live `getBoundingClientRect` (Credentials, light): Regenerate button top 665 /
bottom 697, panel bottom 697 — the button is the trailing element of the tab.

## CR#1 — header / tablist / content share one left edge

Measured on the booted page (both themes): header `WordPress Widget` left =
**464**, tablist left = **464**, content panel left = **464** — coincident.
`ConnectorSetupPage` pins the header and content to the same centered column and
the tab content is Narrow (`max-w-xl`) flush-left, so the shift to Narrow +
card-less content (`dc9a035`) preserves the shared left edge.
See `CR1-left-edge-align-{light,dark}.png`.

## CR#2 — the etched section rule is the same navy, both lines, both themes

Probed on the live page: the `.divider-etched` rule that `TabsListRow` emits has
computed `background = linear-gradient(rgb(21,33,58) 0–1px, transparent 1–6px,
rgb(21,33,58) 6–7px)` — the top line and bottom line are both `rgb(21,33,58)`.
The design-system token `--line-strong` resolves to `#15213a` = `rgb(21,33,58)`
— the same navy — and is **identical in light (`cinatra`) and dark** (the `.dark`
block does not override `--line-strong`). The tablist row is untouched by the
later content commits, so the rule is unchanged from the earlier render.
See `CR2-etched-rule-{light,dark}.png`.

## Files

- `0X-<tab>-{light,dark}.png` — full authenticated page, each tab, both themes.
- `0X-<tab>-{light,dark}-crop.png` — focused crop of the tab content showing the
  action button at the END of the content.
- `CR1-left-edge-align-{light,dark}.png` — header/tablist/content left-edge proof.
- `CR2-etched-rule-{light,dark}.png` — etched section-rule crop.
