import { Trans } from "@lingui/react/macro";
import { Tabs } from "@mantine/core";

import { ClarificationLogPanel } from "./ClarificationLogPanel";
import { ConsentLogPanel } from "./ConsentLogPanel";
import { PrivateResourcesPanel } from "./PrivateResourcesPanel/PrivateResourcesPanel";

/**
 * Renders the workspace settings privacy log.
 * Returns tabbed panels for consent decisions and clarification audits.
 */
export function PrivacyLogTab(): React.ReactNode {
  return (
    <Tabs defaultValue="consent">
      <Tabs.List>
        <Tabs.Tab value="consent">
          <Trans>Consent</Trans>
        </Tabs.Tab>
        <Tabs.Tab value="clarifications">
          <Trans>Clarifications</Trans>
        </Tabs.Tab>
        <Tabs.Tab value="private-resources">
          <Trans>Private resources</Trans>
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="consent" pt="md">
        <ConsentLogPanel />
      </Tabs.Panel>
      <Tabs.Panel value="clarifications" pt="md">
        <ClarificationLogPanel />
      </Tabs.Panel>
      <Tabs.Panel value="private-resources" pt="md">
        <PrivateResourcesPanel />
      </Tabs.Panel>
    </Tabs>
  );
}
