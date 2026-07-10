// Render-pins for the owner's 2026-07-10 review of PR #36 (six asks).
// The setup page is an RSC that composes sdk-ui client primitives + async
// per-instance sections over the host deps slot; every host/UI import is mocked
// so the component tree renders to static markup in a plain node test. The
// async sections are rendered by awaiting them directly (their resolved element
// has only synchronous children in the empty state).

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
// TabsContent for the async per-instance tabs (mcp/webhooks) is skipped so the
// top-level render stays synchronous; those sections are pinned separately below.
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
vi.mock("../components/ui/button", () => ({
  Button: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", { "data-slot": "button" }, children),
}));
vi.mock("../components/ui/input", () => ({ Input: () => null }));
vi.mock("../components/ui/field", () => ({
  FieldGroup: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  Field: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  FieldLabel: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("label", null, children),
}));
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

const depsStub = {
  readWidgetAuthConfig: () => ({
    generatedAt: Date.now(),
    apiKey: "api-key-fixture",
    webhookSecret: "webhook-secret-fixture",
  }),
  generateWidgetAuthConfig: vi.fn(),
  listInstances: () => [] as unknown[],
  registerWebhookSubscription: vi.fn().mockResolvedValue(undefined),
  readInstanceById: () => undefined,
  removeWebhookSubscription: vi.fn(),
  resolveMcpEndpoint: (u: string) => `${u}/mcp`,
  probeMcpAdapter: vi.fn().mockResolvedValue("not_installed"),
  isPrivateUrl: () => false,
  listWebhookSubscriptions: vi.fn().mockResolvedValue([]),
};
vi.mock("../deps", () => ({ getWordPressAssistantDeps: () => depsStub }));

import {
  WordPressAssistantSettingsPage,
  WordPressMcpAdapterSection,
  WebhookSubscriptionsSection,
} from "../settings-page";

describe("setup page — owner review PR#36 (2026-07-10)", () => {
  it("ask 1: primary tab is labelled 'Setup', not 'Credentials'", async () => {
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(html).toContain('data-tab="setup"');
    expect(html).not.toContain('data-tab="credentials"');
    // The four tabs in order, Help last.
    expect(html).toMatch(
      /data-tab="setup">Setup<[\s\S]*data-tab="mcp">MCP<[\s\S]*data-tab="webhooks">Webhooks<[\s\S]*data-tab="help">Help</,
    );
  });

  it("ask 2: 'Plugin credentials' and 'Setup instructions' headings are gone", async () => {
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(html).not.toContain("Plugin credentials");
    expect(html).not.toContain("Setup instructions");
  });

  it("ask 1: the Help tab cross-references the renamed 'Setup' tab", async () => {
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    expect(html).toContain("<strong>Setup</strong> tab");
    expect(html).not.toContain("<strong>Credentials</strong> tab");
  });

  it("ask 3: 'Regenerate credentials' action closes the Setup tab content (below the fields)", async () => {
    const html = renderToStaticMarkup(await WordPressAssistantSettingsPage());
    const actionAt = html.indexOf("Regenerate credentials");
    // The last field's helper text (the webhook-secret signing note) must come
    // BEFORE the action — i.e. the action is the trailing element of the content.
    const lastFieldAt = html.indexOf("X-Cinatra-Sig-256");
    expect(actionAt).toBeGreaterThan(-1);
    expect(lastFieldAt).toBeGreaterThan(-1);
    expect(actionAt).toBeGreaterThan(lastFieldAt);
  });

  it("ask 2 + ask 4: MCP tab drops its heading and always shows 'Add MCP server' (incl. empty state)", async () => {
    const html = renderToStaticMarkup(await WordPressMcpAdapterSection());
    expect(html).not.toContain("WordPress MCP Adapter"); // heading removed
    // Empty state (no sites) still renders the add CTA.
    expect(html).toContain("No WordPress sites are connected yet");
    expect(html).toContain("Add MCP server");
  });

  it("ask 2 + ask 5: Webhooks tab drops its heading and its technical copy", async () => {
    const html = renderToStaticMarkup(await WebhookSubscriptionsSection());
    expect(html).not.toContain("Webhook subscriptions"); // heading removed
    // Old mechanism-centric copy is gone.
    expect(html).not.toContain("cinatra/v1/webhooks");
    expect(html).not.toContain("REST API");
    expect(html).not.toContain("post_published");
    // New plain, benefit-first copy.
    expect(html).toContain("the moment a new post is");
  });
});
