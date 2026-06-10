// Conformance tests for the canonical wp-drupal-assistant contract (v1):
// every golden fixture validates against its schema, and the schemas reject
// the documented malformed payloads.
//
// The cinatra-side RUNTIME validator tests live with the validator in
// cinatra-ai/cinatra (src/lib/__tests__/wp-drupal-contract.test.ts); the
// workflow in this repo additionally deep-compares core's enforced auth-init
// schema copy against the canonical schema here.
import { Validator } from "@cfworker/json-schema";
import { describe, expect, it } from "vitest";

import authInitSchema from "../../../contracts/wp-drupal-assistant/v1/auth-init.schema.json";
import bundleConfigSchema from "../../../contracts/wp-drupal-assistant/v1/bundle-config.schema.json";
import sseEventSchema from "../../../contracts/wp-drupal-assistant/v1/sse-event.schema.json";
import assistantActionSchema from "../../../contracts/wp-drupal-assistant/v1/assistant-action.schema.json";

import authInitWordpress from "../../../contracts/wp-drupal-assistant/v1/fixtures/auth-init.wordpress.json";
import authInitDrupal from "../../../contracts/wp-drupal-assistant/v1/fixtures/auth-init.drupal.json";
import bundleConfigWordpress from "../../../contracts/wp-drupal-assistant/v1/fixtures/bundle-config.wordpress.json";
import bundleConfigDrupal from "../../../contracts/wp-drupal-assistant/v1/fixtures/bundle-config.drupal.json";
import sseEventText from "../../../contracts/wp-drupal-assistant/v1/fixtures/sse-event.text.json";
import sseEventChanges from "../../../contracts/wp-drupal-assistant/v1/fixtures/sse-event.changes.json";
import sseEventError from "../../../contracts/wp-drupal-assistant/v1/fixtures/sse-event.error.json";
import sseEventDone from "../../../contracts/wp-drupal-assistant/v1/fixtures/sse-event.done.json";
import assistantActionStructured from "../../../contracts/wp-drupal-assistant/v1/fixtures/assistant-action.structured.json";
import assistantActionText from "../../../contracts/wp-drupal-assistant/v1/fixtures/assistant-action.text.json";

function makeValidator(schema: unknown): Validator {
  return new Validator(schema as Record<string, unknown>, "2020-12");
}

function assertValid(schema: unknown, instance: unknown, label: string): void {
  const result = makeValidator(schema).validate(instance);
  expect(result.valid, `${label}: ${JSON.stringify(result.errors)}`).toBe(true);
}

describe("wp-drupal contract v1 — golden fixtures conform to schemas", () => {
  it("auth-init fixtures (WordPress + Drupal) validate", () => {
    assertValid(authInitSchema, authInitWordpress, "auth-init.wordpress");
    assertValid(authInitSchema, authInitDrupal, "auth-init.drupal");
  });

  it("bundle-config fixtures (WordPress + Drupal) validate", () => {
    assertValid(bundleConfigSchema, bundleConfigWordpress, "bundle-config.wordpress");
    assertValid(bundleConfigSchema, bundleConfigDrupal, "bundle-config.drupal");
  });

  it("sse-event fixtures (all four frozen event names) validate", () => {
    assertValid(sseEventSchema, sseEventText, "sse-event.text");
    assertValid(sseEventSchema, sseEventChanges, "sse-event.changes");
    assertValid(sseEventSchema, sseEventError, "sse-event.error");
    assertValid(sseEventSchema, sseEventDone, "sse-event.done");
  });

  it("assistant-action fixtures (structured edit + text fallback) validate", () => {
    assertValid(assistantActionSchema, assistantActionStructured, "assistant-action.structured");
    assertValid(assistantActionSchema, assistantActionText, "assistant-action.text");
  });

  it("assistant-action rejects the wire `fields` key (that key belongs to the SSE frame, not the tool result)", () => {
    expect(makeValidator(assistantActionSchema).validate({ fields: [] }).valid).toBe(false);
  });

  it("assistant-action rejects mixing structured + text variants", () => {
    expect(makeValidator(assistantActionSchema).validate({ changes: [], result: "x" }).valid).toBe(false);
  });
});

describe("wp-drupal contract v1 — schemas reject malformed payloads", () => {
  it("auth-init rejects an unknown contractVersion", () => {
    const bad = { ...(authInitWordpress as object), contractVersion: "v2" };
    expect(makeValidator(authInitSchema).validate(bad).valid).toBe(false);
  });

  it("auth-init rejects a missing contractVersion", () => {
    const { contractVersion: _omit, ...rest } = authInitWordpress as Record<string, unknown>;
    expect(makeValidator(authInitSchema).validate(rest).valid).toBe(false);
  });

  it("auth-init rejects an empty messages array", () => {
    const bad = { ...(authInitDrupal as object), messages: [] };
    expect(makeValidator(authInitSchema).validate(bad).valid).toBe(false);
  });

  it("sse-event rejects a data shape that does not match its event name", () => {
    expect(makeValidator(sseEventSchema).validate({ event: "text", data: { message: "x" } }).valid).toBe(false);
    expect(makeValidator(sseEventSchema).validate({ event: "changes", data: { content: "x" } }).valid).toBe(false);
  });

  it("sse-event rejects an unknown event name", () => {
    expect(makeValidator(sseEventSchema).validate({ event: "thinking", data: {} }).valid).toBe(false);
  });

  it("bundle-config rejects a missing apiKey", () => {
    const { apiKey: _omit, ...rest } = bundleConfigWordpress as Record<string, unknown>;
    expect(makeValidator(bundleConfigSchema).validate(rest).valid).toBe(false);
  });
});

describe("wp-drupal contract v1 — schema self-consistency", () => {
  it("auth-init schema's contractVersion const matches the versioned directory (v1)", () => {
    expect(
      (authInitSchema as { properties: { contractVersion: { const: string } } }).properties
        .contractVersion.const,
    ).toBe("v1");
  });
});
