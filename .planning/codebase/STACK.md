# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript (strict mode, ES2023 target) — all source files under `src/`
- TSX — React component files: `src/settings-page.tsx`, `src/setup-page.tsx`, `src/copy-button.tsx`, `src/components/ui/*.tsx`

## Runtime

**Environment:**
- Node.js 24 (specified in `.github/workflows/ci.yml`)

**Package Manager:**
- npm (`.npmrc` present with `auto-install-peers=false`)
- Lockfile: Not detected in repo root (source-mirror repo; monorepo owns install)

## Frameworks

**Core:**
- React 19 (peer dependency `^19.2.3`) — UI component rendering
- Next.js (implied by `"server-only"` imports, `revalidatePath`, `Metadata` type, `export const dynamic`) — server components and server actions

**Testing:**
- Vitest — configured via `"test": "vitest"` in `package.json`; no config file detected in repo root

**Build/Dev:**
- TypeScript compiler — `tsconfig.json` targets `dist/` with `ESNext` modules and `bundler` resolution
- ESNext module format (`"type": "module"` in `package.json`)

## Key Dependencies

**Critical:**
- `class-variance-authority` `^0.7.1` — variant-driven component styling (used in `src/components/ui/`)
- `clsx` `^2.1.1` — conditional className composition
- `tailwind-merge` `^3.5.0` — Tailwind class deduplication (used in `src/lib/utils.ts`)
- `radix-ui` `^1.4.3` — accessible primitive components

**Peer (provided by monorepo host):**
- `react` / `react-dom` `^19.2.3` — host application supplies React
- `@cinatra-ai/sdk-extensions` (optional peer) — `requireExtensionAction` authorization helper
- `@cinatra-ai/sdk-ui` (optional peer) — `Main`, `PageHeader`, `PageContent` layout primitives from `@cinatra-ai/sdk-ui/marketplace`

## Configuration

**Environment:**
- `NEXT_PUBLIC_APP_URL` — public base URL for the Cinatra app (used to construct webhook callback URLs)
- `BETTER_AUTH_URL` — fallback base URL when `NEXT_PUBLIC_APP_URL` is absent
- WordPress instance credentials are read via host-internal lib (`@/lib/wordpress-api`, `@/lib/wordpress-widget-auth`) resolved by the monorepo
- `.env` / `.env.*` files: not present in this repo; secrets live in the monorepo host

**Build:**
- `tsconfig.json` — standalone strict TypeScript config; does not extend a shared config
- `.npmrc` — disables automatic peer installation (`auto-install-peers=false`)

## Platform Requirements

**Development:**
- Must be used inside the Cinatra monorepo workspace; `@cinatra-ai/sdk-extensions` and `@cinatra-ai/sdk-ui` are not published to any registry and are resolved via monorepo workspace linking
- Node.js 24+

**Production:**
- Deployed as part of the Cinatra Next.js application; this package is a source-mirror connector, not a standalone deployable
- Cinatra connector manifest (`package.json#cinatra`) declares `kind: connector` and `apiVersion: cinatra.ai/v1`

---

*Stack analysis: 2026-06-09*
