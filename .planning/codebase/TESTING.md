# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Vitest (configured via `package.json` `scripts.test: "vitest"`)
- No `vitest.config.*` file detected — Vitest runs with default config; it will auto-discover test files matching `**/*.{test,spec}.{ts,tsx}`
- Config: default (no explicit config file)

**Assertion Library:**
- Vitest built-in (`expect`)

**Run Commands:**
```bash
npm test          # Run all tests (vitest)
npx vitest        # Direct vitest invocation
npx vitest --run  # Single run, no watch
npx vitest --coverage  # Coverage report (requires @vitest/coverage-v8 or similar)
```

## Test File Organization

**Location:**
- No test files currently exist in the repository — the `src/` directory contains only production source files

**Naming (prescribed by vitest default):**
- Co-located or separate: `[name].test.ts` / `[name].spec.ts`

**Structure:**
```
src/
├── lib/
│   └── utils.ts               # Utility functions — prime candidate for unit tests
├── components/ui/             # UI primitives — visual testing or snapshot tests
├── settings-page.tsx          # Server component — integration/E2E level
└── copy-button.tsx            # Client component — unit/interaction tests
```

## Test Structure

**Suite Organization:**
- Not applicable — no test files exist. When added, vitest conventions apply:

```typescript
import { describe, it, expect } from "vitest";
import { cn, slugify, asArray } from "../src/lib/utils";

describe("slugify", () => {
  it("converts spaces to hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
});
```

**Patterns:**
- Setup: `beforeEach` / `beforeAll` (vitest globals or imported)
- Teardown: `afterEach` / `afterAll`
- Assertions: `expect(...).toBe(...)`, `expect(...).toEqual(...)` etc.

## Mocking

**Framework:** Vitest (`vi.mock`, `vi.fn`, `vi.spyOn`)

**Patterns:**
- Not applicable — no mocks in use (no test files)
- For Server Actions that call `requireExtensionAction`, `revalidatePath`, and external lib functions, mocks would be required:

```typescript
import { vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@cinatra-ai/sdk-extensions", () => ({
  requireExtensionAction: vi.fn().mockResolvedValue(undefined),
}));
```

**What to Mock:**
- Next.js `revalidatePath` and `redirect` (side effects)
- `requireExtensionAction` from `@cinatra-ai/sdk-extensions` (auth gate)
- External API calls (`@/lib/wordpress-api`, `@/lib/wordpress-widget-auth`, `@/lib/wordpress-mcp-connection`)
- `process.env` values via `vi.stubEnv`

**What NOT to Mock:**
- Pure utility functions in `src/lib/utils.ts` — test these directly

## Fixtures and Factories

**Test Data:**
- Not applicable — no fixtures exist
- Recommended approach for WordPress instance data:

```typescript
const mockInstance = {
  id: "wp-1",
  name: "Test Site",
  siteUrl: "https://example.com",
};
```

**Location:**
- When added, place in `src/__tests__/fixtures/` or alongside test files

## Coverage

**Requirements:** Not enforced — no coverage thresholds configured
**View Coverage:**
```bash
npx vitest --coverage
```

## Test Types

**Unit Tests:**
- Scope: Pure utility functions in `src/lib/utils.ts` (`cn`, `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers`)
- Approach: Direct import and assertion — no mocks needed

**Integration Tests:**
- Scope: Server Actions (credential generation, webhook registration/deletion) with mocked Next.js and Cinatra SDK dependencies
- Not currently present

**E2E Tests:**
- Framework: Not detected / not configured
- Not applicable for this package in isolation; E2E testing would occur at the host application level

## Common Patterns

**Async Testing:**
```typescript
it("registers webhooks", async () => {
  await expect(registerWebhooksAction("wp-1")).resolves.toBeUndefined();
});
```

**Error Testing:**
```typescript
it("throws when instance not found", async () => {
  await expect(registerWebhooksAction("missing-id")).rejects.toThrow(
    "WordPress instance not found."
  );
});
```

## Current Coverage Gap

The repository has zero test files. The highest-value areas to cover first:

1. `src/lib/utils.ts` — pure functions, trivially testable, no mocks needed
2. Server Action error paths in `src/settings-page.tsx` — guard clauses and thrown errors
3. `src/copy-button.tsx` — clipboard interaction (requires jsdom environment)

---

*Testing analysis: 2026-06-09*
