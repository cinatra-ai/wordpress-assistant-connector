<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌───────────────────────────────────────────────────────────────┐
│              Cinatra Host App (Next.js, server)                │
│  Route: /connectors/cinatra-ai/wordpress-assistant-connector/setup │
└────────────────────────┬──────────────────────────────────────┘
                         │  mounts via connector-setup-pages.ts
                         ▼
┌───────────────────────────────────────────────────────────────┐
│  setup-page.tsx  (dispatch shim / entry point)                │
│  Delegates to → WordPressAssistantSettingsPage                │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│  settings-page.tsx  (React Server Component)                  │
│  ┌─────────────────────┐  ┌──────────────────────────────┐    │
│  │ Plugin credentials  │  │ WordPressMcpAdapterSection   │    │
│  │ (generate/show key) │  │ (probe MCP endpoints)        │    │
│  └─────────────────────┘  └──────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WebhookSubscriptionsSection                              │  │
│  │ (list / register / delete webhook subscriptions)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────────┘
                         │ imports from host app (@/lib/...)
                         ▼
┌───────────────────────────────────────────────────────────────┐
│  Host App Library Layer  (not in this repo — peer deps)        │
│  @/lib/wordpress-widget-auth  – generate/read API key & secret │
│  @/lib/wordpress-api          – REST calls to WP REST API      │
│  @/lib/wordpress-mcp-connection – probe MCP adapter plugin     │
│  @cinatra-ai/sdk-extensions   – requireExtensionAction (authz) │
│  @cinatra-ai/sdk-ui           – layout primitives              │
└───────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `WordPressAssistantConnectorSetupPage` | Dispatch shim; invoked by host router | `src/setup-page.tsx` |
| `WordPressAssistantSettingsPage` | RSC root; auth-gates, auto-registers webhooks, renders all sections | `src/settings-page.tsx` |
| `WordPressMcpAdapterSection` | Probes each WP instance for the WordPress/mcp-adapter plugin and displays status badge | `src/settings-page.tsx` |
| `WebhookSubscriptionsSection` | Lists, registers, and deletes `post_published` webhook subscriptions per WP instance | `src/settings-page.tsx` |
| `McpAdapterStatusHint` | Renders context-specific guidance based on MCP adapter status (private URL, auth error, etc.) | `src/settings-page.tsx` |
| `CopyButton` | Client component; clipboard copy with transient ✓ feedback | `src/copy-button.tsx` |
| `Button`, `Input`, `Badge`, `Field*`, `Separator`, `Label` | Primitive UI components styled with CVA + Tailwind | `src/components/ui/` |
| `cn`, `slugify`, utility fns | Shared class-merging and string helpers | `src/lib/utils.ts` |

## Pattern Overview

**Overall:** Next.js React Server Components connector package — a focused single-page admin surface extracted as a publishable npm package consumed by the Cinatra host application.

**Key Characteristics:**
- All data-fetching and mutations happen in React Server Components and `"use server"` actions; no client-side data layer.
- The package exports exactly one symbol (`WordPressAssistantSettingsPage`) from `src/index.ts`; the host mounts it under a dynamic `/connectors/` catch-all route.
- Authorization is enforced at the top of every server action and the page render via `requireExtensionAction` (peer dep `@cinatra-ai/sdk-extensions`).
- The package has no bundler — it ships source (`"main": "./src/index.ts"`) and is compiled by the host Next.js build.
- Business logic (WordPress REST API, auth config, MCP probing) lives in the host app's `@/lib/` layer; this package is a pure UI/presentation surface.

## Layers

**Entry / Route Layer:**
- Purpose: Thin dispatch shim that accepts host-router props and delegates to the settings page.
- Location: `src/setup-page.tsx`
- Contains: A single async default-export server component.
- Depends on: `src/settings-page.tsx`
- Used by: Host app's connector-setup-pages registry.

**Settings Page Layer:**
- Purpose: Auth-gated RSC page; owns all sections, server actions, and page-level data fetching.
- Location: `src/settings-page.tsx`
- Contains: Page component, three section sub-components, three `"use server"` action functions.
- Depends on: Host `@/lib/wordpress-*` libs, `@cinatra-ai/sdk-extensions`, `@cinatra-ai/sdk-ui`, local UI components.
- Used by: `src/setup-page.tsx`.

**UI Component Layer:**
- Purpose: Reusable styled primitives; no domain logic.
- Location: `src/components/ui/`
- Contains: `button.tsx`, `input.tsx`, `badge.tsx`, `field.tsx`, `label.tsx`, `separator.tsx`.
- Depends on: `src/lib/utils.ts`, `class-variance-authority`, `radix-ui`, `tailwind-merge`.
- Used by: `src/settings-page.tsx`, `src/copy-button.tsx`.

**Client Island Layer:**
- Purpose: The only client-side interactivity in the package.
- Location: `src/copy-button.tsx`
- Contains: `CopyButton` (`"use client"`) — clipboard write + transient state.
- Depends on: `src/components/ui/button.tsx`, `lucide-react` (implied icons).
- Used by: `src/settings-page.tsx`.

**Utility Layer:**
- Purpose: Class merging and generic string/number helpers.
- Location: `src/lib/utils.ts`
- Contains: `cn`, `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers`.
- Depends on: `clsx`, `tailwind-merge`.
- Used by: UI components, settings page.

## Data Flow

### Credential Generation

1. User submits the "Generate credentials" form → `generateCredentialsAction` (`src/settings-page.tsx:28`)
2. `requireExtensionAction` enforces `manage` permission.
3. `generateWidgetAuthConfig()` (host `@/lib/wordpress-widget-auth`) mints API key + webhook secret and persists them.
4. `revalidatePath` triggers RSC re-render; `readWidgetAuthConfig()` reads the new values and displays them in copy-able fields.

### Webhook Registration

1. User submits "Register webhooks" form bound to an instance ID → `registerWebhooksAction` (`src/settings-page.tsx:35`)
2. Permission check via `requireExtensionAction`.
3. `readWordPressInstanceById` fetches instance config; `registerWordPressWebhookSubscription` POST-s to the WP REST API (`cinatra/v1/webhooks`).
4. `revalidatePath` re-renders; `WebhookSubscriptionsSection` re-fetches and shows updated subscription list.

### Auto-Registration on Page Load

1. `WordPressAssistantSettingsPage` renders → idempotent `Promise.allSettled` over all configured instances calling `registerWordPressWebhookSubscription` (`src/settings-page.tsx:85`).
2. WP returns 409 on duplicates; errors are swallowed. Manual "Register webhooks" button serves as fallback.

### MCP Adapter Probe

1. `WordPressMcpAdapterSection` maps configured instances → `probeWordPressInstanceMcpAdapter` (host `@/lib/wordpress-mcp-connection`) per instance.
2. Returns `WordPressMcpAdapterStatus`: `"registered"` | `"not_installed"` | `"auth_error"` | `"unreachable"`.
3. Badge and `McpAdapterStatusHint` render contextual guidance.

**State Management:**
- No client state beyond `CopyButton`'s transient `copied` boolean.
- All persistent state lives in the host app's lib layer (env vars, file-based config, WP REST API).

## Key Abstractions

**Connector Package:**
- Purpose: A self-contained npm package that the Cinatra host app installs to add the WordPress Assistant connector UI.
- Examples: `src/index.ts` (public API), `package.json` `cinatra` manifest block.
- Pattern: Publish source; host compiles. Single named export.

**React Server Actions:**
- Purpose: Mutation endpoints colocated with the page; replace API routes for form submissions.
- Examples: `generateCredentialsAction`, `registerWebhooksAction`, `deleteWebhookSubscriptionAction` in `src/settings-page.tsx`.
- Pattern: `"use server"` inline, permission-checked first, `revalidatePath` last.

**CVA UI Components:**
- Purpose: Typed, variant-aware styled primitives for consistent UI.
- Examples: `src/components/ui/button.tsx` (variants: default, outline, secondary, ghost, destructive, link).
- Pattern: `cva` base + variants, `cn` merge, Radix `Slot` for polymorphic rendering.

## Entry Points

**Package Public API:**
- Location: `src/index.ts`
- Triggers: Host app imports `WordPressAssistantSettingsPage`.
- Responsibilities: Single named re-export.

**Connector Setup Page:**
- Location: `src/setup-page.tsx`
- Triggers: Host dynamic route `/connectors/cinatra-ai/wordpress-assistant-connector/setup`.
- Responsibilities: Accepts host router props, delegates to `WordPressAssistantSettingsPage`.

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop (Next.js RSC); async I/O via `Promise.allSettled` for parallel WP instance probing.
- **Global state:** None within this package. Persistent state owned by host `@/lib/` modules.
- **Circular imports:** None detected.
- **Peer compilation:** Package ships unbuilt TypeScript (`"main": "./src/index.ts"`); host Next.js must resolve and compile it. `tsconfig.json` targets `dist/` for standalone use but `noEmit: false` and no build script exists — actual compilation is host-driven.
- **Path alias dependency:** `src/settings-page.tsx` imports `@/lib/wordpress-*` using Next.js path alias `@/` — these modules do NOT exist inside this repo; they must be provided by the host application at runtime.

## Anti-Patterns

### `@/lib` host-app imports inside the connector package

**What happens:** `src/settings-page.tsx` imports `@/lib/wordpress-widget-auth`, `@/lib/wordpress-api`, and `@/lib/wordpress-mcp-connection` using the `@/` alias.
**Why it's wrong:** These paths are resolved by the host app's tsconfig/webpack alias, not by this package's own `tsconfig.json`. The package cannot compile standalone and its `tsconfig.json` will fail to resolve these imports outside the host.
**Do this instead:** Expose host dependencies as injected props or additional peer-dep contracts so the package boundary is explicit and self-contained.

## Error Handling

**Strategy:** Errors in non-critical paths (MCP probing, webhook list fetching) are caught per-instance and displayed inline. Mutations throw on permission failure; other errors propagate to Next.js error boundaries.

**Patterns:**
- `Promise.allSettled` used for parallel instance operations — individual failures do not block others.
- `try/catch` in `WebhookSubscriptionsSection` per-instance; error message shown in place of subscription list.
- Auto-registration errors on page load are silently swallowed (intentional — manual retry button provided).

## Cross-Cutting Concerns

**Logging:** None within this package. Errors surface via Next.js server logs in the host.
**Validation:** Input validation delegated to host `@/lib/` functions. No local validation logic.
**Authentication:** `requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage")` called at page render and in every server action.

---

*Architecture analysis: 2026-06-09*
