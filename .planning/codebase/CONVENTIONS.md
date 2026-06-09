# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` (e.g., `src/settings-page.tsx`, `src/copy-button.tsx`)
- UI primitives: kebab-case `.tsx` under `src/components/ui/` (e.g., `button.tsx`, `badge.tsx`, `field.tsx`)
- Utilities: kebab-case `.ts` (e.g., `src/lib/utils.ts`)
- Entry point: `src/index.ts` (lowercase)

**Functions / Components:**
- React components: PascalCase named function declarations, exported individually (e.g., `function Button(...)`, `function Badge(...)`)
- Internal/private sub-components: PascalCase, not exported (e.g., `McpAdapterStatusHint`, `WordPressMcpAdapterSection`, `WebhookSubscriptionsSection`)
- Utility functions: camelCase (e.g., `cn`, `slugify`, `formatCurrencyMillions`, `asArray`)
- Server Actions: camelCase with `Action` suffix (e.g., `generateCredentialsAction`, `registerWebhooksAction`, `deleteWebhookSubscriptionAction`)

**Variables:**
- camelCase throughout
- Destructured inline where possible (e.g., `const { instances } = getWordPressAPISettings()`)

**Types / Interfaces:**
- PascalCase, prefixed with context where ambiguous (e.g., `WordPressWebhookSubscription`, `WordPressMcpAdapterStatus`)
- `type` keyword preferred over `interface`
- Inline type props for component functions: `React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>`

## Code Style

**Formatting:**
- No Prettier config detected — formatting is likely enforced upstream in the parent monorepo toolchain
- 2-space indentation, double quotes for JSX attributes, no semicolons in some files but generally consistent within each file

**Linting:**
- No `.eslintrc` or `eslint.config.*` found in the repo
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`), but `noImplicitAny` is disabled

**TypeScript config (`tsconfig.json`):**
- Target: `ES2023`
- Module: `ESNext`, resolution: `bundler`
- `isolatedModules: true`, `verbatimModuleSyntax: true`
- `declaration: true`, `declarationMap: true`, `sourceMap: true`
- `skipLibCheck: true`

## Import Organization

**Order (observed):**
1. React / framework imports (`"react"`, `"next/cache"`, etc.)
2. Third-party UI primitives (`radix-ui`, `class-variance-authority`, `lucide-react`)
3. Internal shared lib (`../../lib/utils`)
4. Internal sibling components (`./label`, `./separator`)
5. External Cinatra SDK packages (`@cinatra-ai/sdk-ui/marketplace`, `@cinatra-ai/sdk-extensions`)
6. Application-internal aliases (`@/lib/wordpress-widget-auth`, `@/lib/wordpress-api`)

**Path Aliases:**
- `@/` maps to the application root (used in `settings-page.tsx` for non-local lib imports)
- Relative imports (`../../lib/utils`) used within the package's own component tree

## Error Handling

**Patterns:**
- Server actions throw `Error` with descriptive messages on invalid state (e.g., `throw new Error("WordPress instance not found.")`)
- Async operations that may fail in parallel use `Promise.allSettled` when errors should be swallowed (auto-register webhooks on page load)
- Errors in fetch-type operations are caught with `try/catch`; the caught value is narrowed with `error instanceof Error ? error.message : "Unknown error..."` before being surfaced in UI
- No global error boundary or custom error class hierarchy detected

## Logging

**Framework:** Not detected — no logging library imported
- No `console.log` / `console.error` statements present in source files

## Comments

**When to Comment:**
- File-level comments explain the module's purpose, mount point, and design decisions (see `src/index.ts`, `src/setup-page.tsx`)
- Inline comments explain non-obvious intent: idempotency of auto-register, security rationale for `manage` vs `read` permission gating
- Inline `// unreachable` comments mark exhaustive switch/if branches

**JSDoc/TSDoc:**
- Not used — no `@param` / `@returns` annotations present

## Function Design

**Size:** Server components are moderately large (up to ~465 lines for `settings-page.tsx`) because they inline sub-components that are private to the file; no artificial splitting
**Parameters:** Single destructured props object for React components; positional args for utility functions
**Return Values:** Components return JSX or `null`; utility functions return primitives or arrays

## Module Design

**Exports:**
- `src/index.ts` is the single public export surface; it re-exports only `WordPressAssistantSettingsPage`
- UI primitives export named function + `variants` (e.g., `export { Button, buttonVariants }`)
- `src/lib/utils.ts` exports multiple named utilities

**Barrel Files:**
- `src/index.ts` acts as the package barrel — intentionally minimal (one export only)
- No barrel `index.ts` inside `src/components/ui/` — consumers import directly by file

## Component Patterns

**UI Primitives (`src/components/ui/`):**
- Built with `class-variance-authority` (`cva`) for variant management
- Use `Slot.Root` from `radix-ui` for `asChild` prop polymorphism
- Accept `className` and spread `...props` onto the underlying element
- Attach `data-slot` attributes to every element for CSS targeting

**Server vs Client boundary:**
- Server components and Server Actions: `"use server"` / `import "server-only"` directives at top of file
- Client components: `"use client"` directive at top of file (e.g., `src/copy-button.tsx`, `src/components/ui/field.tsx`)

**Next.js conventions:**
- `export const dynamic = "force-dynamic"` on the settings page to disable static caching
- `revalidatePath(...)` called after every mutating Server Action to invalidate the Next.js cache
- Server Actions are defined as `async function` inside the module and passed to `<form action={...}>`; `.bind(null, arg)` is used for partial application

---

*Convention analysis: 2026-06-09*
