# WordPress / Drupal assistant contract

Versioned wire contract between the Cinatra core and the external CMS assistant
clients:

- `cinatra-ai/wordpress-plugin` (the `cinatra` WordPress plugin)
- `cinatra-ai/drupal-module` (the `cinatra` Drupal module)

This repo is the **canonical home** of the contract. It governs the assistant
surface of BOTH platform connectors — `@cinatra-ai/wordpress-assistant-connector`
(this repo) and `@cinatra-ai/drupal-assistant-connector` — which share one wire
contract by design (the plugin and the module speak the same protocol to the
same core route).

Both clients embed a `contractVersion` in their bootstrap so a plugin built
against one version **fails loud with an admin-visible error** rather than
silently breaking when Cinatra's contract later changes.

## Layout

```
contracts/wp-drupal-assistant/
  v1/
    bundle-config.schema.json     # config block the plugin/module injects for bundle.js
    auth-init.schema.json         # authenticated stream-init POST body (carries contractVersion)
    sse-event.schema.json         # one decoded SSE frame {event, data}; FROZEN to text|changes|error|done
    assistant-action.schema.json  # content-edit action round-trip (the `changes` payload)
    fixtures/                     # ≥1 golden valid example per schema, per platform
```

The JSON Schemas (draft 2020-12) are the **source of truth**. Contract tests in
`tests/contracts/wp-drupal/` validate every fixture against its schema and pin
the malformed-payload rejections.

## Runtime enforcement (in cinatra core)

The cinatra-side runtime validator lives in `cinatra-ai/cinatra` at
`src/lib/wp-drupal-contract.ts`. It enforces an **embedded copy** of
`auth-init.schema.json` (kept at `src/lib/wp-drupal-auth-init.schema.json` in
that repo — bundled, no runtime file I/O). The CI workflow in this repo
deep-compares that enforced copy against the canonical
`v1/auth-init.schema.json` here, so the two cannot drift silently.

`/api/agents/{wordpress,drupal}-content-editor/stream` calls
`validateAuthInitRequest(body)` before doing any work:

- **present + supported** (`v1`) → request proceeds.
- **present + unsupported** (e.g. `v2` against a v1-only instance) → `400` with
  `{ error: { code: "unsupported_contract_version", message, supportedVersions, received } }`.
- **non-conforming versioned body** → `400` with
  `{ error: { code: "invalid_request_shape", … } }`.
- **absent** (legacy/unversioned) → request proceeds (not hard-broken at v0.1.0).

The `400` body is rendered by the widget panel, so the CMS admin sees an
actionable message — never an opaque `500`.

## Adding a new contract version

A breaking change does **not** mutate `v1`. Instead:

1. Add `contracts/wp-drupal-assistant/v2/` here with the changed schemas +
   fixtures.
2. In `cinatra-ai/cinatra`, extend `SUPPORTED_CONTRACT_VERSIONS` + the
   per-version validator wiring in `src/lib/wp-drupal-contract.ts`, and update
   the embedded `src/lib/wp-drupal-auth-init.schema.json` copy to match the new
   canonical schema. The validator core does not change.
3. Ship the `v2`-aware Cinatra backend **first**; then ship the plugin/module
   update that sends `contractVersion: "v2"`. Keep `v1` supported during the
   transition until a deliberate deprecation PR removes it.

See `https://docs.cinatra.ai/guides/developer/wp-drupal-plugin-development/` for the full contract-bump
checklist and the multi-repo coordination workflow.

## CI

`.github/workflows/wp-drupal-contract.yml` in this repo is the contract gate:

- schema + golden-fixture conformance tests (`tests/contracts/wp-drupal/`)
  run on every PR/push;
- the cinatra core's enforced `auth-init` schema copy is deep-compared against
  the canonical schema here (a weekly scheduled run additionally catches
  core-side drift between PRs to this repo).

Lock-step is **bidirectional and canonical-first**: a PR here that changes the
canonical `v1/auth-init.schema.json` skips the cross-repo compare (core follows
up), while a core PR that edits its enforced copy is gated in `cinatra-ai/cinatra`
against the canonical schema on this repo's default branch — so the canonical
change always lands first, and the scheduled run here goes red if core never
follows.

The runtime validator's own unit tests live next to the validator in
`cinatra-ai/cinatra` (`src/lib/__tests__/wp-drupal-contract.test.ts`) and run
in that repo's root vitest gate. The Playwright UAT path-filter in
`cinatra-ai/cinatra` triggers the full WordPress/Drupal end-to-end suite on
changes to its assistant integration surface.
