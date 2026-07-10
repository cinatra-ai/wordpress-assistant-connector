# Full-boot render evidence — PR #36 @ dc9a035

Real, authenticated, full-host-boot render of the WordPress Assistant connector
setup page — the live successor to the static geometry mirror in the parent
folder. This is the full-page, all-four-tabs, light+dark pass the "Answering the
review" comment deferred.

## How it was produced (real surface, not a mirror)

- **Host:** the cinatra monorepo dev server (`pnpm dev`, Next.js 16 / Turbopack),
  booted against the running local dev stack (postgres + redis + nango), with the
  in-tree extension `extensions/cinatra-ai/wordpress-assistant-connector` checked
  out to the PR head `dc9a035` (the `v0.1.2` pin restored afterward).
- **Route (real, not a fixture):**
  `/connectors/cinatra-ai/wordpress-assistant-connector/setup`
- **Auth:** a real authenticated session as the seeded platform admin
  `admin@cinatra.example` (breadcrumb + "Sample Admin" avatar visible in the
  full-page shots). HTTP 200, 0 console errors on every tab.
- **Before/after:** the `*-before` crops re-boot the same host with the extension
  checked out to the pre-fix parent commit `0276f3f`.

## Measured geometry (viewport-relative, `getBoundingClientRect`)

| State | Tab | header-left | tab-content-left | Δ | content width | card? | classes |
|---|---|---|---|---|---|---|---|
| AFTER dc9a035 | Credentials | 459px | 459px | **0px** | 576px | no | `mt-6 w-full max-w-xl` |
| AFTER dc9a035 | MCP | 459px | 459px | **0px** | 576px | no | `mt-6 w-full max-w-xl` |
| AFTER dc9a035 | Webhooks | 459px | 459px | **0px** | 576px | no | `mt-6 w-full max-w-xl` |
| AFTER dc9a035 | Help | 459px | 459px | **0px** | 576px | no | `mt-6 w-full max-w-xl` |
| BEFORE 0276f3f | MCP | 459px | 555px | **+96px** | 576px | yes | `mx-auto mt-6 w-full max-w-xl` |
| BEFORE 0276f3f | Credentials | 459px | 459px | 0px | 768px | yes | `mt-6` + `soft-panel` card |

All four tabs now share the page header's left edge (459px), narrow to
`max-w-xl` (576px), sit flush-left (no `mx-auto`), and carry no whole-tab
`soft-panel` card. The BEFORE MCP crop reproduces the owner's measured **+96px**
offset on the live surface.

## Files

- `wp-fullboot-{credentials,mcp,webhooks,help}-{light,dark}.png` — full-page,
  all four tabs, both themes (8).
- `wp-align-annotated-{light,dark}.png` — violation (a): page-header left edge ==
  tab-content left edge, annotated + measured on the live page.
- `wp-nocard-{before,after}.png` — violation (b): card wrapping tab content
  (before) vs card-less (after).
- `wp-mcp-{before,after}.png` — violations (a)+(c): centered +96px in a card
  (before) vs flush-left Δ0 card-less (after).
