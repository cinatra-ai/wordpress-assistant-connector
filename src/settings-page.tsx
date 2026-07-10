import "server-only";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { FieldGroup, Field, FieldLabel } from "./components/ui/field";
import { ConnectorSetupPage } from "@cinatra-ai/sdk-ui/connector-setup-page";
// Shared design-system Tabs primitive (cinatra-ai/cinatra#1103) — own subpath
// only, deliberately NOT re-exported from `/marketplace` (route-graph ratchet).
// TabsListRow is the shared under-header row primitive: it pairs the tablist
// with the etched section rule so the composition is never hand-rolled (the
// tablist contract forbids hand-rolling the TabsList+rule pairing).
import { Tabs, TabsListRow, TabsTrigger, TabsContent } from "@cinatra-ai/sdk-ui/tabs";
import { requireExtensionAction } from "@cinatra-ai/sdk-extensions";
// Every host surface arrives through the host-bound deps slot (cinatra#172
// Stage H3): widget auth-config from `@cinatra-ai/host:wordpress-widget-auth`,
// the instance reads + remote webhook-subscription client + MCP adapter
// status from `@cinatra-ai/host:wordpress-mcp` — no `@/lib/*` import. The
// "use server" actions CANNOT close over the render-time ctx, hence the slot.
import {
  getWordPressAssistantDeps,
  type WordPressMcpAdapterStatus,
  type WordPressWebhookSubscription,
} from "./deps";
import { Badge } from "./components/ui/badge";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "WordPress Widget | Cinatra" };

async function generateCredentialsAction() {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  getWordPressAssistantDeps().generateWidgetAuthConfig();
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

async function registerWebhooksAction(instanceId: string) {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const instance = getWordPressAssistantDeps().readInstanceById(instanceId);
  if (!instance) {
    throw new Error("WordPress instance not found.");
  }
  const cinatraUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  const targetUrl = `${cinatraUrl.replace(/\/+$/, "")}/api/webhooks/wordpress`;
  await getWordPressAssistantDeps().registerWebhookSubscription(instance, {
    event_type: "post_published",
    target_url: targetUrl,
    post_types: [],
  });
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

async function deleteWebhookSubscriptionAction(instanceId: string, subscriptionId: string) {
  "use server";
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const instance = getWordPressAssistantDeps().readInstanceById(instanceId);
  if (!instance) {
    throw new Error("WordPress instance not found.");
  }
  await getWordPressAssistantDeps().removeWebhookSubscription(instance, subscriptionId);
  revalidatePath("/connectors/cinatra-ai/wordpress-assistant-connector/setup");
}

export async function WordPressAssistantSettingsPage() {
  // 'manage' (not 'read'): this render performs webhook-registration writes on
  // load (the idempotent auto-register below), so it is a mutating surface and
  // must gate on manage rights, not mere read visibility.
  await requireExtensionAction("@cinatra-ai/wordpress-assistant-connector", "manage");
  const config = getWordPressAssistantDeps().readWidgetAuthConfig();
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
  const instancesForAutoReg = getWordPressAssistantDeps().listInstances();
  const targetUrlForAutoReg = `${cinatraUrl.replace(/\/+$/, "")}/api/webhooks/wordpress`;
  await Promise.allSettled(
    instancesForAutoReg.map((instance) =>
      getWordPressAssistantDeps().registerWebhookSubscription(instance, {
        event_type: "post_published",
        target_url: targetUrlForAutoReg,
        post_types: [],
      }),
    ),
  );

  return (
    <ConnectorSetupPage
      title="WordPress Widget"
      description="Generate credentials for the Cinatra WordPress plugin (cinatra.php)."
      divider={false}
      className="flex flex-col gap-6 pb-8"
    >
      <Tabs defaultValue="setup">
        {/* TabsListRow renders the tablist paired with the etched section rule
            that stretches from the last tab to the page edge (design-system
            Tabs). The ConnectorSetupPage header's own divider is off via
            divider={false} so the two rules never stack. */}
        <TabsListRow>
          {/* "Setup" is the primary/overview tab (app-connectors.html §II —
              the setup page's primary tab is labelled "Setup"). */}
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          {/* Help is the reserved tab — always last (app-connectors §II). */}
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsListRow>

        <TabsContent value="setup" className="mt-6 w-full max-w-xl">
          {/* Card-less, Narrow (max-w-xl · 576px), flush-left under the tablist:
              this connector has no Setup/Connections connection surface, so the
              Setup tab is a form-only config tab. Per app-connectors.html §II a
              custom tab's content "narrows to the Narrow width (max-w-xl ·
              576px) … flush-left under the tabs" and "the form is never wrapped
              in its own card". No mx-auto (that would centre it and break the
              header↔content left-edge alignment); no soft-panel wrapper. The
              in-content section heading is dropped per the owner's review
              (2026-07-10): the tab label already names the section. */}
          <section className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {config
                ? `Last generated ${generatedAt}. Regenerating immediately invalidates the previous values.`
                : "No credentials generated yet. Click Generate credentials to create an API key and webhook secret."}
            </p>

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

            {/* Contract rule: the action button sits at the END of the tab
                content, below the fields — matching the spec config-tab render
                where the primary action closes the content ("ending in its own
                Save", app-connectors.html §II). */}
            <form action={generateCredentialsAction} className="mt-2">
              <Button type="submit" variant={config ? "outline" : "default"}>
                {config ? "Regenerate credentials" : "Generate credentials"}
              </Button>
            </form>
          </section>
        </TabsContent>

        {/* WordPress MCP Adapter status — per-instance list. Narrow (max-w-xl),
            flush-left under the tablist (no mx-auto). */}
        <TabsContent value="mcp" className="mt-6 w-full max-w-xl">
          <WordPressMcpAdapterSection />
        </TabsContent>

        {/* Webhook subscriptions — per-instance list. Narrow, flush-left. */}
        <TabsContent value="webhooks" className="mt-6 w-full max-w-xl">
          <WebhookSubscriptionsSection />
        </TabsContent>

        {/* Help — reserved, always-last, read-only (no form, no Save). Narrow,
            flush-left, card-less (§II custom-tab frame rule). */}
        <TabsContent value="help" className="mt-6 w-full max-w-xl">
          <section className="flex w-full flex-col gap-3">
            <ol className="ml-5 list-decimal text-sm text-muted-foreground [&>li+li]:mt-2">
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
                Generate credentials in the <strong>Setup</strong> tab
                (creates an API key and webhook secret).
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
        </TabsContent>
      </Tabs>
    </ConnectorSetupPage>
  );
}

async function McpAdapterStatusHint({ status, siteUrl }: { status: WordPressMcpAdapterStatus; siteUrl: string }) {
  if (status === "registered") {
    if (getWordPressAssistantDeps().isPrivateUrl(siteUrl)) {
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
        <Button
          asChild
          variant="link"
          className="inline h-auto whitespace-normal p-0 text-[length:inherit] font-normal text-inherit underline underline-offset-2 hover:text-foreground"
        >
          <Link href={pluginsUrl} target="_blank" rel="noreferrer">
            Install WordPress/mcp-adapter
          </Link>
        </Button>{" "}
        on this site and activate it.
      </p>
    );
  }

  if (status === "auth_error") {
    return (
      <p className="text-xs text-muted-foreground">
        Credentials rejected. Check that the application password in{" "}
        <Button
          asChild
          variant="link"
          className="inline h-auto whitespace-normal p-0 text-[length:inherit] font-normal text-inherit underline underline-offset-2 hover:text-foreground"
        >
          <Link href="/configuration/llm?modal=wordpress">
            WordPress connector administration
          </Link>
        </Button>{" "}
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

// Exported for the settings-page render test (pins the removed heading + the
// always-visible empty-state CTA). Not re-exported from the package index, so
// the public surface is unchanged.
export async function WordPressMcpAdapterSection() {
  const deps = getWordPressAssistantDeps();
  const instances = deps.listInstances();

  const instanceStatuses = await Promise.all(
    instances.map(async (instance) => {
      const endpoint = deps.resolveMcpEndpoint(instance.siteUrl);
      const status = await deps.probeMcpAdapter(instance);
      return { instance, endpoint, status };
    })
  );

  return (
    // Card-less tab content (§II: "the form is never wrapped in its own card").
    // The per-instance rows below keep their own subordinate record cards.
    // The in-content section heading ("WordPress MCP Adapter") is dropped per
    // the owner's review (2026-07-10): the tab label already names the section.
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Cinatra automatically registers the{" "}
        <Button
          asChild
          variant="link"
          className="inline h-auto whitespace-normal p-0 text-[length:inherit] font-normal text-inherit underline underline-offset-2 hover:text-foreground"
        >
          <Link
            href="https://github.com/WordPress/mcp-adapter"
            target="_blank"
            rel="noreferrer"
          >
            WordPress/mcp-adapter
          </Link>
        </Button>{" "}
        plugin as a parallel MCP server for each configured WordPress site.
        Install the plugin on each WP site — once reachable, its tools are
        available to all Cinatra agents automatically.
      </p>

      {instanceStatuses.length === 0 ? (
        // Empty state: no competing add-link here — "Add MCP server" below is
        // the single add-a-site CTA (kept always-visible per §II: the
        // add-a-connection action is always available).
        <div className="rounded-card border border-line bg-surface p-4 text-sm text-muted-foreground">
          No WordPress sites are connected yet. Use{" "}
          <strong className="font-medium text-foreground">Add MCP server</strong>{" "}
          below to connect one.
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
                <Badge variant={status === "registered" ? (deps.isPrivateUrl(instance.siteUrl) ? "outline" : "default") : "secondary"}>
                  {status === "registered" ? (deps.isPrivateUrl(instance.siteUrl) ? "Local only" : "Registered") : "Not detected"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* "Add MCP server" closes the tab content — it renders OUTSIDE the
          instances conditional above, so it is ALWAYS shown, including the
          no-sites-connected empty state (owner review Q, 2026-07-10). That is
          intentional and spec-correct: it is the add-a-connection action, which
          app-connectors.html §II keeps always available ("Connect adds one …
          Connect is always available"). It is the single add-a-site CTA (the
          empty state above no longer duplicates it), and it sits at the END of
          the tab content (§II — the primary action closes the content). */}
      <div className="mt-2">
        <Button
          asChild
          variant="outline"
          className="h-auto rounded-control border-line bg-surface-strong px-4 py-2 text-foreground hover:border-foreground/30 hover:bg-surface-muted"
        >
          <Link href="/connectors/wordpress">Add MCP server</Link>
        </Button>
      </div>
    </section>
  );
}

// Exported for the settings-page render test (pins the removed heading + the
// rewritten plain-language copy). Not re-exported from the package index.
export async function WebhookSubscriptionsSection() {
  const deps = getWordPressAssistantDeps();
  const instances = deps.listInstances();

  const instanceResults = await Promise.all(
    instances.map(async (instance) => {
      try {
        const subscriptions = await deps.listWebhookSubscriptions(instance);
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
    // Card-less tab content (§II: "the form is never wrapped in its own card").
    // The per-instance rows below keep their own subordinate record cards.
    // Card-less; heading dropped and copy rewritten in plain user language per
    // the owner's review (2026-07-10) — describe what the user gets, not the
    // REST/subscription mechanism.
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Keep Cinatra in step with your site automatically. Once a WordPress
        site is connected, Cinatra is notified the moment a new post is
        published there, so your agents can act on it straight away — nothing
        to copy or paste, and no changes needed on your side.
      </p>

      {instanceResults.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-4 text-sm text-muted-foreground">
          No WordPress sites are connected yet. Connect one to start getting
          updates when new posts are published.
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
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">{instance.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="rounded-chip bg-surface-strong px-1 py-0.5 text-xs">
                      {instance.siteUrl}
                    </code>
                  </p>
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

                {/* Contract rule: the per-instance action closes the card
                    content, below the subscription list (app-connectors.html
                    §II — the action ends the content, never heads it). */}
                <form action={registerAction} className="mt-3">
                  <Button
                    type="submit"
                    variant={subscriptions.length === 0 && !error ? "default" : "outline"}
                    size="sm"
                  >
                    Register webhooks
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
