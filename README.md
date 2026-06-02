# WordPress Assistant

Generate the credentials that connect the Cinatra WordPress plugin (cinatra.php) to your workspace, so authors can launch the Cinatra assistant from inside the WordPress post editor. This surface mints the API key the plugin uses and registers the publish webhooks Cinatra listens to.

## Capabilities

- Generate and rotate the API key used by the Cinatra WordPress widget plugin
- Copy the Cinatra URL and key to paste into the plugin's settings
- Register a post-published webhook so Cinatra reacts when a site publishes a post
- List and remove existing webhook subscriptions for a connected site
