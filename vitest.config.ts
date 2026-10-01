import { defineConfig } from "vitest/config";
import * as path from "node:path";

// Package-local test config.
//
// WITHOUT IT this package has no vitest config of its own, so running `vitest`
// from here inside the cinatra monorepo layout (extensions/cinatra-ai/<slug>/)
// walks UP and loads the HOST ROOT vitest.config.ts. That config's `include` is
// written for the host tree and starts at `src/**/__tests__/**` — which happens
// to match the two suites under src/, and matches NOTHING under tests/.
//
// The consequence was silent, not loud: the run exited 0 and reported
// "2 passed", so every count-based look at it said healthy — while
// tests/contracts/wp-drupal/contract-v1.test.ts, the canonical
// wp-drupal-assistant v1 wire-contract conformance suite (every golden fixture
// validated against its schema, plus the documented malformed-payload
// rejections), had been collected by NOTHING since it landed in #4. This repo's
// own CI cannot catch that either: it declares host-internal @cinatra-ai/*
// peers, so its `Test` step skips standalone on the grounds that the monorepo
// runs these.
//
// Found by cinatra#2288's extension-suite discovery gate, which compares the
// test files vitest actually EXECUTED against the ones on disk instead of
// trusting a green exit code.
//
// `environment: "node"` is correct and not a downgrade: settings-page.test.tsx
// asserts markup through react-dom/server, and the contract suite is pure JSON
// Schema validation — no DOM is touched by any of the three files. The JSX
// transform comes from this package's own tsconfig ("jsx": "react-jsx").
export default defineConfig({
  resolve: {
    alias: [
      { find: "@cinatra-ai/design-primitives", replacement: path.join(__dirname, "src/__tests__/fixtures/design-primitives.tsx") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
  },
});
