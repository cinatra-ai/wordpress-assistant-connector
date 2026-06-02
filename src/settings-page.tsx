import "server-only";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { FieldGroup, Field, FieldLabel } from "./components/ui/field";
import { Main, PageHeader, PageContent } from "@cinatra-ai/sdk-ui/marketplace";
import { requireExtensionAction } from "@cinatra-ai/sdk-extensions";
import {
  generateWidgetAuthConfig,
  readWidgetAuthConfig,
} from "@/lib/wordpress-widget-auth";
import {
  getWordPressAPISettings,
  readWordPressInstanceById,
  listWordPressWebhookSubscriptions,
  registerWordPressWebhookSubscription,
  deleteWordPressWebhookSubscription,
  type WordPressWebhookSubscription,
} from "@/lib/wordpress-api";
import { resolveWordPressMcpEndpoint, probeWordPressInstanceMcpAdapter, isPrivateUrl, type WordPressMcpAdapterStatus } from "@/lib/wordpress-mcp-connection";
import { Badge } from "./components/ui/badge";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "WordPress Widget | Cinatra" };

async function generateCredentialsAction() {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  generateWidgetAuthConfig();
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

async function registerWebhooksAction(instanceId: string) {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const instance = readWordPressInstanceById(instanceId);
  if (!instance) {
    throw new Error("WordPress instance not found.");
  }
  const cinatraUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  const targetUrl = `${cinatraUrl.replace(/\/+$/, "")}/api/webhooks/wordpress`;
  await registerWordPressWebhookSubscription(instance, {
    event_type: "post_published",
    target_url: targetUrl,
    post_types: [],
  });
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

async function deleteWebhookSubscriptionAction(instanceId: string, subscriptionId: string) {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const instance = readWordPressInstanceById(instanceId);
  if (!instance) {
    throw new Error("WordPress instance not found.");
  }
  await deleteWordPressWebhookSubscription(instance, subscriptionId);
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

export async function WordPressAssistantSettingsPage() {
  // 'manage' (not 'read'): this render performs webhook-registration writes on
  // load (the idempotent auto-register below), so it is a mutating surface and
  // must gate on manage rights, not mere read visibility.
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const config = readWidgetAuthConfig();
  const cinatraUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  const generatedAt = config?.generatedAt
    ? new Date(config.generatedAt).toLocaleString()
    : null;

  // Auto-register webhooks for all configured instances on every page load.
  // The WP endpoint returns 409 on duplicate — treated as success — so this is idempotent.
  // Errors are swallowed; the "Register webhooks" button remains as manual retry fallback.
  const { instances: instancesForAutoReg } = getWordPressAPISettings();
  const targetUrlForAutoReg = `${cinatraUrl.replace(/\/+$/, "")}/api/webhooks/wordpress`;
  await Promise.allSettled(
    instancesForAutoReg.map((instance) =>
      registerWordPressWebhookSubscription(instance, {
        event_type: "post_published",
        target_url: targetUrlForAutoReg,
        post_types: [],
      }),
    ),
  );

  return (
    <Main className="min-h-screen">
      <PageHeader
        title="WordPress Widget"
        description="Generate credentials for the Cinatra WordPress plugin (cinatra.php)."
      />
      <PageContent className="flex flex-col gap-6 pb-8">
        <div className="flex items-start gap-6">
          <section className="soft-panel flex min-w-0 flex-1 flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Plugin credentials
                </h2>
                <p className="text-sm text-muted-foreground">
                  {config
                    ? `Last generated ${generatedAt}. Regenerating immediately invalidates the previous values.`
                    : "No credentials generated yet. Click Generate credentials to create an API key and webhook secret."}
                </p>
              </div>
              <form action={generateCredentialsAction}>
                <Button type="submit" variant={config ? "outline" : "default"}>
                  {config ? "Regenerate credentials" : "Generate credentials"}
                </Button>
              </form>
            </div>

            {config ? (
              <FieldGroup className="border-t border-line pt-4">
                <Field>
                  <FieldLabel>Cinatra URL</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={cinatraUrl}
                      className="font-mono text-sm"
                    />
                    <CopyButton value={cinatraUrl} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste into the WordPress plugin&apos;s{" "}
                    <code>cinatra_url</code> field.
                  </p>
                </Field>
                <Field>
                  <FieldLabel>API key</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={config.apiKey}
                      className="font-mono text-sm"
                    />
                    <CopyButton value={config.apiKey} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste into the WordPress plugin&apos;s{" "}
                    <code>cinatra_api_key</code> field. Used as{" "}
                    <code>Authorization: Bearer &lt;key&gt;</code> by the widget.
                  </p>
                </Field>
                <Field>
                  <FieldLabel>Webhook secret</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={config.webhookSecret}
                      className="font-mono text-sm"
                    />
                    <CopyButton value={config.webhookSecret} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste into the WordPress plugin&apos;s{" "}
                    <code>cinatra_webhook_secret</code> field. Used to sign{" "}
                    <code>X-Cinatra-Sig-256</code> on outbound webhooks.
                  </p>
                </Field>
              </FieldGroup>
            ) : null}
          </section>

          <section className="soft-panel w-1/3 shrink-0 flex-col gap-3 p-6">
            <h2 className="text-base font-semibold text-foreground">
              Setup instructions
            </h2>
            <ol className="ml-5 mt-3 list-decimal text-sm text-muted-foreground [&>li+li]:mt-2">
              <li>
                Install the WordPress MCP Adapter plugin (recommended — enables AI
                tool access).
              </li>
              <li>
                Install the Cinatra plugin (
                <code>dev/wordpress-plugin/cinatra.php</code>) on your
                WordPress site.
              </li>
              <li>
                Generate credentials above (creates an API key and webhook
                secret).
              </li>
              <li>
                In WordPress, go to Administration &gt; Cinatra and paste the
                three values.
              </li>
              <li>
                A floating Cinatra button appears in the bottom-right corner of
                every WP admin page.
              </li>
            </ol>
          </section>
        </div>

        {/* WordPress MCP Adapter status */}
        <WordPressMcpAdapterSection />
        {/* Webhook subscriptions */}
        <WebhookSubscriptionsSection />
      </PageContent>
    </Main>
  );
}

async function McpAdapterStatusHint({ status, siteUrl }: { status: WordPressMcpAdapterStatus; siteUrl: string }) {
  if (status === "registered") {
    if (isPrivateUrl(siteUrl)) {
      return (
        <p className="text-xs text-muted-foreground">
          Local/private URL — plugin is reachable but agents cannot use it because external LLM providers cannot connect to private addresses. Use a public URL or tunnel (e.g. Cloudflare Tunnel) to enable agent access.
        </p>
      );
    }
    return null;
  }

  const pluginsUrl = `${siteUrl.replace(/\/+$/, "")}/wp-admin/plugins.php`;

  if (status === "not_installed") {
    return (
      <p className="text-xs text-muted-foreground">
        Plugin not active.{" "}
        <a href={pluginsUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          Install WordPress/mcp-adapter
        </a>{" "}
        on this site and activate it.
      </p>
    );
  }

  if (status === "auth_error") {
    return (
      <p className="text-xs text-muted-foreground">
        Credentials rejected. Check that the application password in{" "}
        <a href="/configuration/llm?modal=wordpress" className="underline underline-offset-2 hover:text-foreground">
          WordPress connector administration
        </a>{" "}
        has permission to access the REST API.
      </p>
    );
  }

  // unreachable
  return (
    <p className="text-xs text-muted-foreground">
      Site unreachable. Check that <code className="rounded-chip bg-surface-strong px-1 py-0.5">{siteUrl}</code> is accessible from this server.
    </p>
  );
}

async function WordPressMcpAdapterSection() {
  const { instances } = getWordPressAPISettings();

  const instanceStatuses = await Promise.all(
    instances.map(async (instance) => {
      const endpoint = resolveWordPressMcpEndpoint(instance.siteUrl);
      const status = await probeWordPressInstanceMcpAdapter(instance);
      return { instance, endpoint, status };
    })
  );

  return (
    <section className="soft-panel flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">
            WordPress MCP Adapter
          </h2>
          <p className="text-sm text-muted-foreground">
            Cinatra automatically registers the{" "}
            <a
              href="https://github.com/WordPress/mcp-adapter"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              WordPress/mcp-adapter
            </a>{" "}
            plugin as a parallel MCP server for each configured WordPress site.
            Install the plugin on each WP site — once reachable, its tools are
            available to all Cinatra agents automatically.
          </p>
        </div>
        <a
          href="/connectors/wordpress"
          className="shrink-0 inline-flex items-center justify-center rounded-control border border-line bg-surface-strong px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-surface-muted"
        >
          Add MCP server
        </a>
      </div>

      {instanceStatuses.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-4 text-sm text-muted-foreground">
          No WordPress instances configured. Add a WordPress connector in{" "}
          <a href="/configuration/llm?modal=wordpress" className="underline underline-offset-2 hover:text-foreground">
            Administration → LLM → WordPress
          </a>{" "}
          to enable the MCP adapter integration.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {instanceStatuses.map(({ instance, endpoint, status }) => (
            <div key={instance.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">{instance.name}</p>
                  <p className="text-xs text-muted-foreground">
                    MCP endpoint:{" "}
                    <code className="rounded-chip bg-surface-strong px-1 py-0.5 text-xs">
                      {endpoint}
                    </code>
                  </p>
                  <McpAdapterStatusHint status={status} siteUrl={instance.siteUrl} />
                </div>
                <Badge variant={status === "registered" ? (isPrivateUrl(instance.siteUrl) ? "outline" : "default") : "secondary"}>
                  {status === "registered" ? (isPrivateUrl(instance.siteUrl) ? "Local only" : "Registered") : "Not detected"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function WebhookSubscriptionsSection() {
  const { instances } = getWordPressAPISettings();

  const instanceResults = await Promise.all(
    instances.map(async (instance) => {
      try {
        const subscriptions = await listWordPressWebhookSubscriptions(instance);
        return {
          instance,
          subscriptions,
          error: null as string | null,
        };
      } catch (error) {
        return {
          instance,
          subscriptions: [] as WordPressWebhookSubscription[],
          error: error instanceof Error ? error.message : "Unknown error while fetching subscriptions.",
        };
      }
    }),
  );

  return (
    <section className="soft-panel flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          Webhook subscriptions
        </h2>
        <p className="text-sm text-muted-foreground">
          Cinatra registers the events it wants through the WordPress plugin&apos;s{" "}
          <code className="rounded-chip bg-surface-strong px-1 py-0.5 text-xs">cinatra/v1/webhooks</code>{" "}
          REST API. Click <strong>Register webhooks</strong> to subscribe to <code>post_published</code>{" "}
          on a configured WordPress instance. No manual copy-pasting required.
        </p>
      </div>

      {instanceResults.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-4 text-sm text-muted-foreground">
          No WordPress instances configured. Add a WordPress connector in{" "}
          <a
            href="/configuration/llm?modal=wordpress"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Administration → LLM → WordPress
          </a>{" "}
          before registering webhooks.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {instanceResults.map(({ instance, subscriptions, error }) => {
            const registerAction = registerWebhooksAction.bind(null, instance.id);
            return (
              <div
                key={instance.id}
                className="rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{instance.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code className="rounded-chip bg-surface-strong px-1 py-0.5 text-xs">
                        {instance.siteUrl}
                      </code>
                    </p>
                  </div>
                  <form action={registerAction}>
                    <Button
                      type="submit"
                      variant={subscriptions.length === 0 && !error ? "default" : "outline"}
                      size="sm"
                    >
                      Register webhooks
                    </Button>
                  </form>
                </div>

                {error ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Could not fetch subscriptions: {error}
                  </p>
                ) : subscriptions.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No subscriptions registered yet.
                  </p>
                ) : (
                  <ul className="mt-3 [&>li+li]:mt-2">
                    {subscriptions.map((subscription) => {
                      const deleteAction = deleteWebhookSubscriptionAction.bind(null, instance.id, subscription.id);
                      return (
                        <li
                          key={subscription.id}
                          className="flex items-start justify-between gap-3 rounded-control border border-line bg-surface-strong p-3"
                        >
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">{subscription.event_type}</Badge>
                              {subscription.post_types.length > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  post_types: {subscription.post_types.join(", ")}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  post_types: all
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              <code className="rounded-chip bg-surface px-1 py-0.5 text-xs">
                                {subscription.target_url}
                              </code>
                            </p>
                          </div>
                          <form action={deleteAction}>
                            <Button type="submit" variant="outline" size="sm">
                              Delete
                            </Button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
