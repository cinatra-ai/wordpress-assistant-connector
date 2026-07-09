# Verification evidence — #35 (MCP / Webhooks / Help tabs)

Dev-boot Playwright screenshots proving the tabbed `WordPressAssistantSettingsPage`
against a production-equivalent local build (real Postgres/Redis/Next.js dev
server; `@cinatra-ai/sdk-ui/tabs` from the not-yet-merged cinatra#1103 branch
cherry-picked into a throwaway local worktree so the primitive was actually
present at render time). All values shown (API key, webhook secret, account
email) are freshly-generated dev-only fixtures with no real-world validity.

- `01-credentials-tab-empty.png` — Credentials tab (default/selected), light, no credentials generated yet.
- `02-mcp-tab-empty.png` — MCP tab, light, no WordPress instances configured (empty state).
- `03-webhooks-tab-empty.png` — Webhooks tab, light, empty state.
- `04-help-tab.png` — Help tab (last), light, via mouse click.
- `05-keyboard-arrowright-x3-lands-help.png` — 3x ArrowRight from Credentials lands on Help with a visible focus ring (roving tabindex keyboard nav proof).
- `06-help-tab-dark-mode.png` — Help tab, dark theme.
- `07-credentials-tab-populated-dark.png` — Credentials tab after "Generate credentials", dark theme.
- `08-credentials-tab-populated-light.png` — Credentials tab after "Generate credentials", light theme.

DOM-level a11y check (Playwright `evaluate`, same session as screenshot 05):

```
[
  { "text": "Credentials", "selected": "false", "tabIndex": -1 },
  { "text": "MCP",         "selected": "false", "tabIndex": -1 },
  { "text": "Webhooks",    "selected": "false", "tabIndex": -1 },
  { "text": "Help",        "selected": "true",  "tabIndex": 0 }
]
```

Tab order in the DOM: Credentials, MCP, Webhooks, Help (Help last, per
app-connectors §II's reserved-Help-tab convention). `role=tablist`/`role=tab`/
`role=tabpanel` + `aria-selected`/`aria-controls`/`aria-labelledby` all present
(Radix, via the shared `@cinatra-ai/sdk-ui/tabs` primitive — unmodified).
