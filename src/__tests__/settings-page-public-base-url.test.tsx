// The settings page shows and registers the application's address as the
// host's runtime port reports it, keeping its local default when the host
// reports none.

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));
vi.mock("@cinatra-ai/sdk-extensions", () => ({
  requireExtensionAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@cinatra-ai/sdk-ui/connector-setup-page", () => ({
  ConnectorSetupPage: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-slot": "setup-page" }, children),
}));
vi.mock("@cinatra-ai/sdk-ui/tabs", () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TabsListRow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-slot": "tabs-list" }, children),
  TabsTrigger: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement("button", { "data-tab": value }, children),
  TabsContent: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-panel": value },
      value === "mcp" || value === "webhooks" ? null : children,
    ),
}));
vi.mock("../copy-button", () => ({ CopyButton: () => null }));
vi.mock("@cinatra-ai/design-primitives", () => ({
  Button: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", { "data-slot": "button" }, children),
  Input: ({ value }: { value?: string }) =>
    React.createElement("input", { value, readOnly: true }),
  FieldGroup: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Field: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  FieldLabel: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("label", null, children),
  Badge: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

const INSTANCE = {
  id: "wp-1",
  name: "Site",
  siteUrl: "https://wp.example",
  username: "u",
  applicationPassword: "p",
};
const registerWebhookSubscription = vi.fn();
let depsStub: Record<string, unknown>;

function makeStub(extra: Record<string, unknown>) {
  return {
    readWidgetAuthConfig: () => ({
      generatedAt: Date.now(),
      apiKey: "api-key-fixture",
      webhookSecret: "webhook-secret-fixture",
    }),
    generateWidgetAuthConfig: vi.fn(),
    listInstances: () => [INSTANCE],
    registerWebhookSubscription,
    readInstanceById: () => undefined,
    removeWebhookSubscription: vi.fn(),
    resolveMcpEndpoint: (u: string) => `${u}/mcp`,
    probeMcpAdapter: vi.fn().mockResolvedValue("not_installed"),
    isPrivateUrl: () => false,
    listWebhookSubscriptions: vi.fn().mockResolvedValue([]),
    ...extra,
  };
}
vi.mock("../deps", () => ({ getWordPressAssistantDeps: () => depsStub }));

import { WordPressAssistantSettingsPage } from "../settings-page";

const PATH = "/webhook/cinatra-ai/wordpress-mcp-connector/post-published";

describe("settings page — application address from the host runtime port", () => {
  beforeEach(() => {
    registerWebhookSubscription.mockReset();
    registerWebhookSubscription.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("S1: uses the host's address, trailing slash trimmed in the target", async () => {
    depsStub = makeStub({ publicBaseUrl: () => "https://app.example.test/" });
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(registerWebhookSubscription).toHaveBeenCalledTimes(1);
    expect(registerWebhookSubscription).toHaveBeenCalledWith(INSTANCE, {
      event_type: "post_published",
      target_url: `https://app.example.test${PATH}`,
      post_types: [],
    });
    expect(html).toContain('value="https://app.example.test/"');
  });

  it("S2: keeps the local default when the host reports none", async () => {
    depsStub = makeStub({ publicBaseUrl: () => null });
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(registerWebhookSubscription).toHaveBeenCalledWith(INSTANCE, {
      event_type: "post_published",
      target_url: `http://localhost:3000${PATH}`,
      post_types: [],
    });
    expect(html).toContain('value="http://localhost:3000"');
  });

  it("S3: keeps the local default when the member is absent", async () => {
    depsStub = makeStub({});
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(registerWebhookSubscription).toHaveBeenCalledWith(INSTANCE, {
      event_type: "post_published",
      target_url: `http://localhost:3000${PATH}`,
      post_types: [],
    });
    expect(html).toContain('value="http://localhost:3000"');
  });
});
