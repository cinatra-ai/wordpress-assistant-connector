# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
wordpress-assistant-connector/
├── src/
│   ├── index.ts                  # Package public API — single named export
│   ├── settings-page.tsx         # Root RSC page + server actions + section sub-components
│   ├── setup-page.tsx            # Dispatch shim mounted by host connector router
│   ├── copy-button.tsx           # "use client" clipboard copy island
│   ├── components/
│   │   └── ui/
│   │       ├── badge.tsx         # Badge primitive (CVA variants)
│   │       ├── button.tsx        # Button primitive (CVA variants + Radix Slot)
│   │       ├── field.tsx         # FieldGroup / Field / FieldLabel layout helpers
│   │       ├── input.tsx         # Input primitive
│   │       ├── label.tsx         # Label primitive
│   │       └── separator.tsx     # Separator primitive
│   └── lib/
│       └── utils.ts              # cn, slugify, and generic string/number helpers
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI pipeline
│       └── release.yml           # Release pipeline
├── .npmrc                        # npm registry configuration
├── package.json                  # Package manifest + cinatra connector descriptor
├── tsconfig.json                 # Standalone TypeScript config (targets dist/)
├── LICENSE                       # Apache-2.0
└── README.md                     # Package overview and capability list
```

## Directory Purposes

**`src/`:**
- Purpose: All source code for the connector package.
- Contains: RSC page components, server actions, client islands, UI primitives, utilities.
- Key files: `src/index.ts` (public API), `src/settings-page.tsx` (all page logic).

**`src/components/ui/`:**
- Purpose: Reusable styled UI primitives; no domain logic.
- Contains: Six component files built with `class-variance-authority` and `radix-ui`.
- Key files: `src/components/ui/button.tsx` (most complex — six variants, seven sizes).

**`src/lib/`:**
- Purpose: Shared utilities used across the package.
- Contains: `utils.ts` — class merging (`cn`) and generic helpers.

**`.github/workflows/`:**
- Purpose: CI and release automation.
- Contains: `ci.yml`, `release.yml`.

## Key File Locations

**Entry Points:**
- `src/index.ts`: Package public API — exports `WordPressAssistantSettingsPage`.
- `src/setup-page.tsx`: Host-router entry point for the connector setup route.

**Core Logic:**
- `src/settings-page.tsx`: All page rendering, server actions, and data fetching.

**Configuration:**
- `package.json`: npm manifest; includes `cinatra` block declaring `apiVersion`, `kind: "connector"`, and `displayName`.
- `tsconfig.json`: TypeScript compiler options; standalone config targeting `dist/`.
- `.npmrc`: npm registry settings.

**UI Components:**
- `src/components/ui/button.tsx`: Most feature-complete primitive — reference for CVA pattern.
- `src/components/ui/field.tsx`: `FieldGroup`, `Field`, `FieldLabel` layout composites.

**Utilities:**
- `src/lib/utils.ts`: `cn` (clsx + tailwind-merge), `slugify`, pagination helpers, and formatters.

## Naming Conventions

**Files:**
- kebab-case for all files: `settings-page.tsx`, `copy-button.tsx`, `badge.tsx`.
- Suffix `-page.tsx` for page-level components: `settings-page.tsx`, `setup-page.tsx`.
- No barrel `index.ts` inside `components/ui/` — import each primitive directly.

**Components:**
- PascalCase named exports: `WordPressAssistantSettingsPage`, `CopyButton`, `Button`, `Badge`.
- Page-level RSC sub-components (sections) are unexported async functions in the same file: `WordPressMcpAdapterSection`, `WebhookSubscriptionsSection`, `McpAdapterStatusHint`.

**Server Actions:**
- camelCase, `Action` suffix: `generateCredentialsAction`, `registerWebhooksAction`, `deleteWebhookSubscriptionAction`.

**Utilities:**
- camelCase functions in `src/lib/utils.ts`: `cn`, `slugify`, `asArray`, `compareValues`.

## Where to Add New Code

**New settings section (RSC sub-component):**
- Add as an unexported async function in `src/settings-page.tsx` and render it inside `WordPressAssistantSettingsPage`.

**New server action:**
- Add inside `src/settings-page.tsx` with `"use server"` directive; follow the pattern: permission check → business logic → `revalidatePath`.

**New UI primitive:**
- Create `src/components/ui/<name>.tsx` using CVA + `cn` from `src/lib/utils.ts`.
- Import directly by path (no barrel re-export).

**New client-side interactive component:**
- Create at `src/<name>.tsx` with `"use client"` as the first line. See `src/copy-button.tsx` as the reference.

**New utility function:**
- Add to `src/lib/utils.ts`.

**New public export:**
- Add the named export to `src/index.ts`.

## Special Directories

**`dist/`:**
- Purpose: TypeScript compiler output (declarations + source maps).
- Generated: Yes (`tsc` per `tsconfig.json`).
- Committed: No (not present in repo; implied by `outDir` in tsconfig).

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents.
- Generated: Yes (by GSD tooling).
- Committed: Project-dependent.

---

*Structure analysis: 2026-06-09*
