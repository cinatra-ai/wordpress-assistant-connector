# Codebase Concerns

**Analysis Date:** 2026-06-09

## Tech Debt

**Orphaned utility functions in `src/lib/utils.ts`:**
- Issue: `src/lib/utils.ts` exports functions (`formatCurrencyMillions`, `quarterLabel`, `getPageNumbers`, `firstName`, `compareValues`, `slugify`) that have no clear connection to the WordPress assistant connector domain. These are generic monorepo utilities that were copied or carried over during extraction.
- Files: `src/lib/utils.ts`
- Impact: Dead code inflates the bundle; signals the file was pasted wholesale from the parent monorepo rather than curated for this connector.
- Fix approach: Remove unused utilities; keep only `cn` (used by UI components) and any helper directly referenced in connector files. Verify via grep before removing.

**`noImplicitAny: false` alongside `strict: true`:**
- Issue: `tsconfig.json` sets `"strict": true` then immediately overrides with `"noImplicitAny": false`, weakening strict mode's most important guard.
- Files: `tsconfig.json`
- Impact: Implicit `any` types can silently bypass the type system, masking bugs in server actions and API integration code.
- Fix approach: Remove the `noImplicitAny: false` override and fix any resulting type errors.

**Hard-coded fallback URL in server actions and page render:**
- Issue: Both `registerWebhooksAction` and `WordPressAssistantSettingsPage` fall back to `"http://localhost:3000"` when neither `NEXT_PUBLIC_APP_URL` nor `BETTER_AUTH_URL` is set. The fallback is silently used in production if env vars are misconfigured.
- Files: `src/settings-page.tsx` (lines 43–45, 73–75)
- Impact: Webhooks registered with a localhost target URL will fail silently in production; errors are swallowed by `Promise.allSettled`.
- Fix approach: Throw or log an explicit error when neither env var is present in non-development environments instead of falling back to localhost.

**`package.json` missing a lockfile:**
- Issue: The repo has no `pnpm-lock.yaml` (or any lockfile). The CI workflow installs with `--no-frozen-lockfile`.
- Files: `package.json`, `.github/workflows/ci.yml`
- Impact: Builds are non-reproducible; dependency resolution differs between machines and CI runs, making regression tracking unreliable.
- Fix approach: Commit a lockfile and switch CI to `--frozen-lockfile` once the monorepo integration model is confirmed.

**`main` and `types` fields point to TypeScript source, not compiled output:**
- Issue: `package.json` sets `"main": "./src/index.ts"` and `"types": "./src/index.ts"`. These are source paths, not distribution paths. Consumers must have `ts-node` or a bundler configured to handle raw TypeScript.
- Files: `package.json`
- Impact: Any consumer that performs a plain `require`/`import` from the published package will fail unless a bundler is involved. The intent appears to be monorepo-only use, but the mismatch is undocumented.
- Fix approach: Either set `"main"` and `"types"` to compiled `dist/` paths and integrate a build step, or add an explicit comment in `package.json` documenting that this package is consumed only as a monorepo workspace source.

## Known Bugs

**Silent webhook auto-registration errors on page load:**
- Symptoms: If webhook registration fails for any instance on the settings page load, the error is silently discarded by `Promise.allSettled`. The UI shows no feedback and the "Register webhooks" button is the only retry path — but users do not know they need to retry.
- Files: `src/settings-page.tsx` (lines 85–93)
- Trigger: Network error or auth failure reaching WordPress REST API during page render.
- Workaround: User manually clicks "Register webhooks" per instance. No error surfaces unless the list fetch also fails.

**`generateCredentialsAction` does not `await` its async work:**
- Symptoms: `generateWidgetAuthConfig()` is called without `await` inside an async server action. If `generateWidgetAuthConfig` is async (defined in the host monorepo), the action returns before generation completes, and `revalidatePath` runs against stale state.
- Files: `src/settings-page.tsx` (line 31)
- Trigger: Every click of "Generate credentials".
- Workaround: None visible at connector level; depends on whether the monorepo implementation is synchronous.

## Security Considerations

**API key and webhook secret rendered in plain-text input fields:**
- Risk: The API key and webhook secret are displayed in read-only `<Input>` elements with no masking. Any shoulder surfer, screen recording, or browser extension can capture these values.
- Files: `src/settings-page.tsx` (lines 140–168)
- Current mitigation: Fields are read-only; the page requires `manage` permission via `requireExtensionAction`.
- Recommendations: Use `type="password"` inputs with a toggle-reveal pattern for sensitive credential fields, or show only the last 4 characters by default.

**No CSRF protection visible for server actions:**
- Risk: Next.js server actions rely on framework-level CSRF mitigations. This connector does not add any additional token validation. If the host application's Next.js version or config does not enforce origin checking, server actions (`generateCredentialsAction`, `registerWebhooksAction`, `deleteWebhookSubscriptionAction`) could be triggered cross-site.
- Files: `src/settings-page.tsx`
- Current mitigation: `requireExtensionAction` gates all mutating actions on permission checks.
- Recommendations: Verify the host Next.js version enforces same-origin for server actions (Next.js 14.1+ does this by default). Document this dependency explicitly.

**`.npmrc` file present:**
- Existence noted: `.npmrc` is present. Contents contain only `auto-install-peers=false` (no auth tokens observed). Confirm no token is added before publishing.

## Performance Bottlenecks

**Sequential-then-parallel MCP probe and webhook list on every page render:**
- Problem: `WordPressAssistantSettingsPage` fires `Promise.allSettled` for webhook auto-registration, then two child components each fire `Promise.all` for MCP probe and webhook list fetches — all on every uncached page render (`export const dynamic = "force-dynamic"`).
- Files: `src/settings-page.tsx` (lines 85–93, 263–268, 339–356)
- Cause: `force-dynamic` disables Next.js caching; every page load hits WordPress REST API endpoints for every configured instance.
- Improvement path: Add short-lived server-side caching (e.g., `unstable_cache` with a 30-second TTL) for read operations (MCP probe, subscription list). Keep write operations (auto-registration) uncached.

## Fragile Areas

**Host-monorepo path aliases in `settings-page.tsx`:**
- Files: `src/settings-page.tsx` (lines 12–21)
- Why fragile: Imports use `@/lib/wordpress-widget-auth` and `@/lib/wordpress-api` — path aliases that resolve only within the host monorepo's TypeScript config. These imports will fail in any standalone build or typecheck outside the monorepo workspace.
- Safe modification: Do not add additional `@/` imports. Any new functionality must either be self-contained in this repo's `src/lib/` or imported from declared peer dependencies.
- Test coverage: No tests exist in this repo; the monorepo is responsible for testing, but the fragile import graph is not visible here.

**Peer dependency version mismatch risk (`react: ^19.2.3`):**
- Files: `package.json`
- Why fragile: The peer dependency pins React to `^19.2.3`, a pre-release / early major version. Any host that uses React 18 will see unresolved peer dependency warnings or silent version mismatches.
- Safe modification: Widen the peer range to `">=18"` or `"^18 || ^19"` if React 18 hosts are a target.

## Scaling Limits

**Per-instance synchronous probing on page render:**
- Current capacity: Acceptable for 1–3 WordPress instances.
- Limit: With 10+ configured instances, page render time grows linearly; each `probeWordPressInstanceMcpAdapter` call is a network round-trip with no timeout enforced at the connector level.
- Scaling path: Implement probe timeouts (e.g., `AbortSignal.timeout(3000)`) and cache results server-side.

## Dependencies at Risk

**`radix-ui` v1 (unified package) vs. `@radix-ui/*` individual packages:**
- Risk: The `radix-ui` v1 package is a relatively new unified distribution; older Radix ecosystem tooling and documentation target individual `@radix-ui/react-*` packages. Breaking changes between the unified and scoped APIs are possible.
- Impact: UI components in `src/components/ui/` may break on Radix API changes.
- Migration plan: Pin to a specific minor version and monitor the Radix changelog; migrate to individual scoped packages if the unified package diverges.

**`react: ^19.2.3` peer dependency:**
- Risk: React 19 is a major version with breaking changes (notably around refs, `use`, and server component APIs). Pinning to `^19.2.3` as a peer ensures the connector only works with React 19+ hosts, cutting off React 18.
- Impact: Any host application on React 18 cannot use this connector without version conflicts.
- Migration plan: Widen peer range or document the React 19 requirement explicitly in README.

## Missing Critical Features

**No error boundary or user-visible error state for failed MCP probes:**
- Problem: `WordPressMcpAdapterSection` uses `Promise.all` (not `allSettled`) for MCP probes. A single instance probe throwing an unhandled rejection will crash the entire section render with no user-visible fallback.
- Files: `src/settings-page.tsx` (lines 263–268)
- Blocks: Reliable display of MCP adapter status when any instance is unreachable.

**No loading / suspense state for server component sections:**
- Problem: `WordPressMcpAdapterSection` and `WebhookSubscriptionsSection` are async server components that perform network I/O with no `<Suspense>` boundary. The entire settings page blocks until all WordPress API calls resolve.
- Files: `src/settings-page.tsx`
- Blocks: Perceived performance on the settings page when WordPress instances are slow to respond.

## Test Coverage Gaps

**No tests exist in this repository:**
- What's not tested: All connector logic — server actions (`generateCredentialsAction`, `registerWebhooksAction`, `deleteWebhookSubscriptionAction`), render logic for settings page, UI components, and utility functions.
- Files: Entire `src/` directory.
- Risk: Regressions in credential generation, webhook registration, or MCP adapter status display go undetected until monorepo integration tests (if any) catch them.
- Priority: High — the server actions perform write operations (credential generation, webhook registration/deletion) with no unit-level safety net.

**Utility functions have no tests despite being non-trivial:**
- What's not tested: `getPageNumbers`, `slugify`, `compareValues`, `formatCurrencyMillions` in `src/lib/utils.ts`.
- Files: `src/lib/utils.ts`
- Risk: Edge cases (e.g., `slugify` with Unicode input, `getPageNumbers` boundary conditions) are untested.
- Priority: Low (these utilities appear to be unused within this connector's actual functionality).

---

*Concerns audit: 2026-06-09*
