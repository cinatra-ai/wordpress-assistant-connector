// `register(ctx)` shape — the cinatra#172 Stage H3 serverEntry cutover: the
// connector binds its host deps slot itself (always-bind, lazy per-call
// host-service resolution over `@cinatra-ai/host:wordpress-widget-auth` +
// `@cinatra-ai/host:wordpress-mcp`). Leaf-graph pin: the entry imports ONLY
// ./deps. Slot-timing coverage (cinatra#172 finding 8): the slot is populated
// AT ACTIVATION — before the settings page / its "use server" actions resolve
// it — and an unbound slot fails LOUD naming the package and the registration
// step.

import { describe, expect, it, vi, beforeEach } from "vitest";

import { register } from "../register";
import {
  getWordPressAssistantDeps,
  registerWordPressAssistantConnector,
  _resetWordPressAssistantDepsForTests,
} from "../deps";

function activateWithServices(impls: Record<string, unknown>) {
  const resolveProviders = vi.fn((capability: string) =>
    impls[capability] !== undefined
      ? [{ packageName: "@cinatra-ai/host", impl: impls[capability] }]
      : [],
  );
  const ctx = {
    capabilities: { registerProvider: () => {}, resolveProviders },
  } as never;
  register(ctx);
  return { resolveProviders };
}

const INSTANCE = {
  id: "wp-1",
  name: "Site",
  siteUrl: "https://wp.example",
  username: "u",
  applicationPassword: "p",
};
const SUB = {
  id: "sub-1",
  event_type: "post_published",
  target_url: "https://app.example/api/webhooks/wordpress",
  post_types: [] as string[],
  created_at: "2026-01-03T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetWordPressAssistantDepsForTests();
});

describe("register(ctx) — deps binding (cinatra#172 Stage H3)", () => {
  it("binds the deps slot at activation, resolving host services LAZILY at call time", async () => {
    const read = vi.fn(() => ({
      apiKey: "k-1",
      webhookSecret: "s-1",
      generatedAt: "2026-01-01T00:00:00Z",
    }));
    const generate = vi.fn(() => ({
      apiKey: "k-2",
      webhookSecret: "s-2",
      generatedAt: "2026-01-02T00:00:00Z",
    }));
    const getAPISettings = vi.fn(() => ({ instances: [INSTANCE] }));
    const readInstanceById = vi.fn((id: string) => (id === "wp-1" ? INSTANCE : null));
    const list = vi.fn(async () => [SUB]);
    const registerSub = vi.fn(async () => SUB);
    const remove = vi.fn(async () => {});
    const resolveEndpoint = vi.fn(
      (siteUrl: string) => `${siteUrl}/wp-json/mcp/mcp-adapter-default-server`,
    );
    const probeAdapter = vi.fn(async () => "registered" as const);
    const isPrivateUrl = vi.fn(() => false);
    const { resolveProviders } = activateWithServices({
      "@cinatra-ai/host:wordpress-widget-auth": { read, generate },
      "@cinatra-ai/host:wordpress-mcp": {
        getAPISettings,
        readInstanceById,
        resolveEndpoint,
        probeAdapter,
        isPrivateUrl,
        webhookSubscriptions: { list, register: registerSub, remove },
      },
    });
    // No host-service resolution happened at registration (probe-safe), but
    // the slot IS bound — settings-page bundles resolving it later succeed.
    expect(resolveProviders).not.toHaveBeenCalled();

    expect(getWordPressAssistantDeps().readWidgetAuthConfig()).toEqual({
      apiKey: "k-1",
      webhookSecret: "s-1",
      generatedAt: "2026-01-01T00:00:00Z",
    });
    expect(getWordPressAssistantDeps().generateWidgetAuthConfig()).toEqual({
      apiKey: "k-2",
      webhookSecret: "s-2",
      generatedAt: "2026-01-02T00:00:00Z",
    });
    expect(getWordPressAssistantDeps().listInstances()).toEqual([INSTANCE]);
    expect(getWordPressAssistantDeps().readInstanceById("wp-1")).toEqual(INSTANCE);
    expect(getWordPressAssistantDeps().readInstanceById("nope")).toBeNull();
    await expect(getWordPressAssistantDeps().listWebhookSubscriptions(INSTANCE)).resolves.toEqual([
      SUB,
    ]);
    const subInput = { event_type: "post_published", target_url: SUB.target_url, post_types: [] };
    await expect(
      getWordPressAssistantDeps().registerWebhookSubscription(INSTANCE, subInput),
    ).resolves.toEqual(SUB);
    expect(registerSub).toHaveBeenCalledWith(INSTANCE, subInput);
    await expect(
      getWordPressAssistantDeps().removeWebhookSubscription(INSTANCE, "sub-1"),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(INSTANCE, "sub-1");
    // PRIMARY pretty-permalink endpoint (NOT the toolbox's fallback form).
    expect(getWordPressAssistantDeps().resolveMcpEndpoint("https://wp.example")).toBe(
      "https://wp.example/wp-json/mcp/mcp-adapter-default-server",
    );
    await expect(getWordPressAssistantDeps().probeMcpAdapter(INSTANCE)).resolves.toBe("registered");
    expect(getWordPressAssistantDeps().isPrivateUrl("http://10.0.0.1")).toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(getAPISettings).toHaveBeenCalledTimes(1);
  });

  it("REPLACES a pre-bound deps slot (always-bind — a hot-update digest swap re-binds fresh resolvers)", () => {
    const sentinel = vi.fn(() => null);
    registerWordPressAssistantConnector({ readWidgetAuthConfig: sentinel } as never);
    activateWithServices({
      "@cinatra-ai/host:wordpress-widget-auth": { read: () => null, generate: vi.fn() },
    });
    expect(getWordPressAssistantDeps().readWidgetAuthConfig()).toBeNull();
    expect(sentinel).not.toHaveBeenCalled();
  });

  it("fails LOUD (descriptive) on a missing host service at call time", () => {
    activateWithServices({});
    expect(() => getWordPressAssistantDeps().readWidgetAuthConfig()).toThrow(
      /host service "@cinatra-ai\/host:wordpress-widget-auth" is not registered/,
    );
    expect(() => getWordPressAssistantDeps().listInstances()).toThrow(
      /host service "@cinatra-ai\/host:wordpress-mcp" is not registered/,
    );
  });

  it("fails LOUD with the package name + registration step when the SLOT itself is unbound", () => {
    // No register(ctx) ran at all (e.g. a settings-page bundle resolving the
    // slot before activation): the getter must name the package and the
    // missing registration step.
    expect(() => getWordPressAssistantDeps()).toThrow(
      /@cinatra-ai\/wordpress-assistant-connector: host runtime deps not registered[\s\S]*registerWordPressAssistantConnector/,
    );
  });
});
