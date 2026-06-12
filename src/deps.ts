// Host DI singleton for the WordPress Assistant connector's runtime deps.
//
// The connector carries NO non-SDK `@cinatra-ai/*` code dependency and NO `@/`
// host-internal import (cinatra#172 Stage H3): every host-shared surface it
// needs is delivered here, bound at activation by `register(ctx)` adapting the
// per-concern host services published in the capability registry
// (`@cinatra-ai/host:wordpress-widget-auth`, `@cinatra-ai/host:wordpress-mcp`).
// Surfaces:
//   - widget auth-config — read + generate of the Cinatra plugin credentials
//                          (`@/lib/wordpress-widget-auth` stays host-side; the
//                          webhook HMAC verification stays host-only).
//                          `generateWidgetAuthConfig` is a WRITER (mints and
//                          persists a fresh API key + webhook secret,
//                          invalidating the old pair) and is only ever called
//                          behind the settings page's manage-gated
//                          "use server" action.
//   - instance reads     — settings rows + by-id lookup (`@/lib/wordpress-api`
//                          stays host-side).
//   - webhook subscriptions — the remote `cinatra/v1/webhooks` client
//                          (list/register/remove run host-side over the
//                          instance row's direct Basic auth; register/remove
//                          are WRITERS against the remote WordPress site,
//                          manage-gated at the calling actions / page render).
//   - MCP adapter status — PRIMARY endpoint resolution + cached reachability
//                          probe + private-URL policy
//                          (`@/lib/wordpress-mcp-connection` stays host-side).
//
// The deps slot is anchored on `globalThis` via a namespaced+versioned Symbol
// so the boot-time registration and the runtime callers — which live in
// SEPARATELY-COMPILED Next.js bundles (the settings page and its "use server"
// actions do NOT import the registrar) — resolve the SAME slot. A plain
// module-local binding would leave those bundles' instance unregistered →
// getWordPressAssistantDeps() would throw. (Same reason as the SDK
// action-guard + the wordpress-mcp/drupal-assistant deps slots.)

/** Widget auth config row (structural mirror of the host's
 * `WidgetAuthConfig` — no SDK type import needed to compile against any host
 * this connector can meet during skew). */
export type WordPressWidgetAuthConfig = {
  apiKey: string;
  webhookSecret: string;
  generatedAt: string;
};

/** Structural WP instance row (mirror of the host's
 * `WordPressInstanceSettings`; Nango binding + metadata optional for skew —
 * host rows always carry them). */
export type WordPressAssistantInstance = {
  id: string;
  name: string;
  siteUrl: string;
  username: string;
  applicationPassword: string;
  providerConfigKey?: string;
  connectionId?: string;
  lastValidatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  blogConnectorId?: string;
};

/** Remote `cinatra/v1/webhooks` subscription row (host client shape). */
export type WordPressWebhookSubscription = {
  id: string;
  event_type: string;
  target_url: string;
  post_types: string[];
  created_at: string;
};

/** Probe verdict for a WP mcp-adapter endpoint (host-bound cached probe). */
export type WordPressMcpAdapterStatus =
  | "registered"
  | "not_installed"
  | "auth_error"
  | "unreachable";

export interface WordPressAssistantConnectorDeps {
  /** Read the stored widget auth config (null when never generated). */
  readWidgetAuthConfig: () => WordPressWidgetAuthConfig | null;
  /** WRITER — mint + persist a fresh widget API key + webhook secret
   * (invalidates the old pair). Only ever called behind the settings page's
   * manage-gated "use server" action — the same `requireExtensionAction`
   * posture as the static import it replaces. */
  generateWidgetAuthConfig: () => WordPressWidgetAuthConfig;
  /** Full instance settings rows (host `@/lib/wordpress-api` settings). */
  listInstances: () => WordPressAssistantInstance[];
  /** One instance row by id (null when unknown). */
  readInstanceById: (id: string) => WordPressAssistantInstance | null;
  /** Remote webhook-subscription list for one instance (host Basic auth). */
  listWebhookSubscriptions: (
    instance: WordPressAssistantInstance,
  ) => Promise<WordPressWebhookSubscription[]>;
  /** WRITER — idempotent remote subscription upsert (HTTP 409 == success).
   * Reached from the manage-gated "use server" action AND the manage-gated
   * page render's idempotent auto-register. */
  registerWebhookSubscription: (
    instance: WordPressAssistantInstance,
    subscription: { event_type: string; target_url: string; post_types?: string[] },
  ) => Promise<WordPressWebhookSubscription>;
  /** WRITER — idempotent remote subscription delete (404 == already gone).
   * Manage-gated at the calling action, as above. */
  removeWebhookSubscription: (
    instance: WordPressAssistantInstance,
    subscriptionId: string,
  ) => Promise<void>;
  /** PRIMARY (`/wp-json/...` pretty-permalink) MCP endpoint form — the
   * canonical URL shown in the admin UI. NOT the fallback
   * (`index.php?rest_route=`) form the wordpress-mcp-connector toolbox
   * injects — do not conflate (cinatra#172 H3 design hazard). */
  resolveMcpEndpoint: (siteUrl: string) => string;
  /** Cached mcp-adapter reachability probe for one instance (host-bound). */
  probeMcpAdapter: (instance: WordPressAssistantInstance) => Promise<WordPressMcpAdapterStatus>;
  /** True for private/local URLs external LLM providers cannot reach. */
  isPrivateUrl: (url: string) => boolean;
}

const WORDPRESS_ASSISTANT_DEPS_KEY = Symbol.for(
  "@cinatra-ai/wordpress-assistant-connector:host-deps/v1",
);
type DepsHolder = { [k: symbol]: WordPressAssistantConnectorDeps | null | undefined };
const _holder = globalThis as unknown as DepsHolder;

export function registerWordPressAssistantConnector(
  deps: WordPressAssistantConnectorDeps,
): void {
  _holder[WORDPRESS_ASSISTANT_DEPS_KEY] = deps;
}

export function getWordPressAssistantDeps(): WordPressAssistantConnectorDeps {
  const deps = _holder[WORDPRESS_ASSISTANT_DEPS_KEY];
  if (!deps) {
    throw new Error(
      "@cinatra-ai/wordpress-assistant-connector: host runtime deps not registered. " +
        "Call registerWordPressAssistantConnector(deps) at boot.",
    );
  }
  return deps;
}

/** @internal test-only. */
export function _resetWordPressAssistantDepsForTests(): void {
  _holder[WORDPRESS_ASSISTANT_DEPS_KEY] = null;
}
