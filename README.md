# WordPress Assistant

Generate the credentials that wire the Cinatra WordPress plugin (cinatra.php) to your workspace, so authors and editors can open the Cinatra assistant directly from inside the WordPress post editor. The connector mints an API key (used by the plugin as a bearer token on widget requests) and a webhook secret (used to verify the `X-Cinatra-Sig-256` signature on outbound webhooks), copies them to a read-only settings page so you can paste them into the WordPress administration panel, and automatically registers a `post_published` webhook on every configured WordPress instance so Cinatra reacts whenever a site publishes a post.

To connect a site: install the Cinatra plugin on your WordPress site, click **Generate credentials** in the connector settings page, then paste the three values (Cinatra URL, API key, webhook secret) into the WordPress administration panel under the Cinatra section. A floating Cinatra button will appear in the bottom-right corner of every WordPress admin page. Regenerating credentials immediately invalidates the previous pair; update the plugin settings straight away.

For agent-level WordPress tool access, install the [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter) plugin on each site. This connector probes each configured WordPress instance to verify whether the adapter is reachable and shows the resolved MCP endpoint URL in the settings page. Sites at private or local URLs are reachable for credential management but cannot be used by external AI providers; expose them via a public tunnel (for example Cloudflare Tunnel) to enable full agent access.

## Works with

- WordPress sites running the Cinatra plugin (cinatra.php)
- WordPress sites running the WordPress MCP Adapter plugin

## Capabilities

- Generate and rotate the API key and webhook secret used by the Cinatra WordPress plugin
- Display the Cinatra URL and credentials as copyable fields for pasting into the WordPress administration panel
- Automatically register a `post_published` webhook on every configured WordPress instance
- List active webhook subscriptions per site and remove individual subscriptions
- Probe each configured WordPress instance for the WordPress MCP Adapter plugin and show its status (registered, not installed, auth error, or unreachable)
- Display the resolved MCP endpoint URL for each site in the settings page
