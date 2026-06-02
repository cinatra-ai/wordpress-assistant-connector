// Dispatch-route entry — mounted by the dynamic /connectors catch-all via
// src/lib/connector-setup-pages.ts.
import { WordPressAssistantSettingsPage } from "./settings-page";

type ConnectorSetupPageProps = {
  packageId: string;
  slug: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function WordPressAssistantConnectorSetupPage(
  _props: ConnectorSetupPageProps,
) {
  return WordPressAssistantSettingsPage();
}
