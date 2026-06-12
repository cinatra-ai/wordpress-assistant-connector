// The wordpress-assistant connector's `register(ctx)` server entry.
//
// hostInternal pinned-empty sweep (cinatra#172 Stage H3): the settings page
// and its "use server" actions stop importing `@/lib/wordpress-widget-auth` /
// `@/lib/wordpress-api` / `@/lib/wordpress-mcp-connection` — this entry binds
// the connector's host deps AT ACTIVATION by adapting the per-concern host
// services published in the capability registry
// (`@cinatra-ai/host:wordpress-widget-auth`, `@cinatra-ai/host:wordpress-mcp`).
// Every adapter member resolves its host service LAZILY at call time, so
// activation order against the host's boot imports never matters.
//
// Registration-only (no I/O) — safe under required-extension-activation's
// prod-boot arming, and probe-safe (the hot-update probe's `resolveProviders`
// reads stay live, so a probe-bound deps slot resolves identically to an
// activation-bound one). Imports stay LEAF-only (`./deps`): the package index
// re-exports React components that must stay OUT of the serverEntry graph.
//
// SDK imports here are TYPE-ONLY (host-peer value-import ban): the host
// services arrive as DATA through `ctx.capabilities`; the capability ids are
// inlined string literals; the per-concern service shapes are local
// structural types so the connector compiles against ANY host SDK it can
// meet during skew.

import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import {
  registerWordPressAssistantConnector,
  type WordPressAssistantConnectorDeps,
} from "./deps";

const PACKAGE_NAME = "@cinatra-ai/wordpress-assistant-connector";

// Local STRUCTURAL shapes of the per-concern host services this connector
// adapts into its deps slot.
type HostWordPressWidgetAuthShape = {
  read: WordPressAssistantConnectorDeps["readWidgetAuthConfig"];
  generate: WordPressAssistantConnectorDeps["generateWidgetAuthConfig"];
};
type HostWordPressMcpShape = {
  getAPISettings: () => {
    instances: ReturnType<WordPressAssistantConnectorDeps["listInstances"]>;
  };
  readInstanceById: WordPressAssistantConnectorDeps["readInstanceById"];
  // PRIMARY pretty-permalink endpoint — distinct from the service's
  // `resolveServerUrl` FALLBACK member (which this connector does not bind).
  resolveEndpoint: WordPressAssistantConnectorDeps["resolveMcpEndpoint"];
  probeAdapter: WordPressAssistantConnectorDeps["probeMcpAdapter"];
  isPrivateUrl: WordPressAssistantConnectorDeps["isPrivateUrl"];
  webhookSubscriptions: {
    list: WordPressAssistantConnectorDeps["listWebhookSubscriptions"];
    register: WordPressAssistantConnectorDeps["registerWebhookSubscription"];
    remove: WordPressAssistantConnectorDeps["removeWebhookSubscription"];
  };
};

/** Lazy per-concern host-service resolution (fail-loud on a missing service —
 * the host boot wiring publishes these before any connector call runs). */
function hostService<T>(ctx: ExtensionHostContext, capability: string): T {
  const provider = ctx.capabilities.resolveProviders(capability)[0];
  if (!provider) {
    throw new Error(
      `${PACKAGE_NAME}: host service "${capability}" is not registered — ` +
        `the host boot wiring (register-host-connector-services) must run before connector calls.`,
    );
  }
  return provider.impl as T;
}

/** Build the host-bound deps from the per-concern host services. Every member
 * resolves LAZILY at call time — constructing this object does no I/O and no
 * resolution (probe-safe). */
function buildHostBoundDeps(ctx: ExtensionHostContext): WordPressAssistantConnectorDeps {
  const widgetAuth = () =>
    hostService<HostWordPressWidgetAuthShape>(ctx, "@cinatra-ai/host:wordpress-widget-auth");
  const wordpressMcp = () =>
    hostService<HostWordPressMcpShape>(ctx, "@cinatra-ai/host:wordpress-mcp");
  return {
    readWidgetAuthConfig: () => widgetAuth().read(),
    // WRITER — only ever reached through the settings page's manage-gated
    // "use server" action (the host service's TRUST note documents the
    // shared in-process capability id; gating stays here, extension-side).
    generateWidgetAuthConfig: () => widgetAuth().generate(),
    listInstances: () => wordpressMcp().getAPISettings().instances,
    readInstanceById: (id) => wordpressMcp().readInstanceById(id),
    listWebhookSubscriptions: (instance) => wordpressMcp().webhookSubscriptions.list(instance),
    // WRITERS against the remote WordPress site — manage-gated at the calling
    // actions / page render (idempotent: 409 == registered, 404 == removed).
    registerWebhookSubscription: (instance, subscription) =>
      wordpressMcp().webhookSubscriptions.register(instance, subscription),
    removeWebhookSubscription: (instance, subscriptionId) =>
      wordpressMcp().webhookSubscriptions.remove(instance, subscriptionId),
    resolveMcpEndpoint: (siteUrl) => wordpressMcp().resolveEndpoint(siteUrl),
    probeMcpAdapter: (instance) => wordpressMcp().probeAdapter(instance),
    isPrivateUrl: (url) => wordpressMcp().isPrivateUrl(url),
  };
}

export function register(ctx: ExtensionHostContext): void {
  // Bind the host deps slot. Always-bind: re-activation — incl. a hot-update
  // digest swap — re-binds fresh lazy resolvers, so a stale deps object can
  // never outlive its digest.
  registerWordPressAssistantConnector(buildHostBoundDeps(ctx));
}
