# Finisher evidence — TabsListRow swap + CR#2 etched-rule pixel-compare

Covers the two non-gated mechanical finishers on PR #36 (branch `feat/35`,
commit `0276f3f`):

1. **TabsListRow adoption** — the hand-rolled
   `grid-cols-[auto_1fr] items-end gap-7` + `TabsList(border-b-0)` + vendored
   `<Separator major decorative>` composition was replaced with the shared
   `TabsListRow` primitive from `@cinatra-ai/sdk-ui/tabs`. The primitive emits
   the byte-identical row (same grid, same `TabsList` with `border-b-0`, the
   etched section rule to the right of the last tab). The connector still passes
   `divider={false}` to `ConnectorSetupPage`, so the header rule and the tablist
   rule never stack.

2. **CR#2 etched-rule pixel-compare** — proves the product's etched rule (the
   `.divider-etched` utility that `TabsListRow` emits) matches app.html's own
   `.etched-rule` reference: **both lines are the same navy `--line-strong`
   token**, in light and dark.

## Evidence class (stated honestly)

These two crops are a **real-browser render of the actual shipped design CSS** —
`packages/design/src/tokens.css` and `packages/design/src/utilities.css` are
imported **verbatim, unmodified** over HTTP and rendered in headless Chromium
(Playwright 1.61). The product rule under test is the real `.divider-etched`
utility; the reference rule is app.html's `.etched-rule` transcribed
byte-for-byte from `design@cb69e75a specs/app.html` line 105. This is a
CSS/primitive-level conformance render, **not** a full authenticated host-app
boot of the connector page (see the PR body for why the full-boot full-page pass
is deferred and why the swap is render-neutral vs the existing `98afa28`
dev-boot screenshots).

## Computed-style assertion (Playwright `getComputedStyle`, both themes)

```
light  --line-strong = #15213a
  spec .etched-rule   border-top rgb(21,33,58)  border-bottom rgb(21,33,58)  h=5px
  product .divider-etched  gradient rgb(21,33,58) 0–1px … rgb(21,33,58) 6–7px  h=7px
dark   --line-strong = #15213a   (the .dark block does not override --line-strong)
  spec .etched-rule   border-top rgb(21,33,58)  border-bottom rgb(21,33,58)  h=5px
  product .divider-etched  gradient rgb(21,33,58) 0–1px … rgb(21,33,58) 6–7px  h=7px
```

Both lines resolve to the identical navy `rgb(21,33,58)` (= `#15213a`) — top and
bottom, spec and product, light and dark. That is exactly the CR#2 ask: the
section rule shows the **same colour on both lines**.

- `cr2-etched-rule-compare-light.png` — spec `.etched-rule` vs product
  `.divider-etched`, light, with 9× pixel-zoom insets of each rule.
- `cr2-etched-rule-compare-dark.png` — same, dark. Both rules render identically
  (the navy `--line-strong` reads as a subtle two-line etch on the dark surface,
  spec and product matching).
