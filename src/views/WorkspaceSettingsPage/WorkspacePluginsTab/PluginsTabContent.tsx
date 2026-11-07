import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { getBundledPluginEntries } from "@/lib/plugins/pluginIndexHelpers";
import { PluginSettingsList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsList";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { LoadedManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";

type Props = Readonly<{
  loadedManifests: LoadedManifestModules | undefined;
  installations: readonly PluginInstallation.T[];
  canManage: boolean;
}>;

/**
 * The plugin cards of the Plugins tab, with a notice when some manifests
 * failed to load or when this deployment bundles no plugins at all.
 */
export function PluginsTabContent({
  loadedManifests,
  installations,
  canManage,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <>
      {loadedManifests?.hasFailures ? (
        <Callout
          messageSize="sm"
          message={t`Some plugins could not be loaded. Reload the page to try again.`}
        />
      ) : null}
      {getBundledPluginEntries().length === 0 ? (
        <Text>
          <Trans>No plugins are available in this deployment.</Trans>
        </Text>
      ) : null}
      <PluginSettingsList
        manifestModules={loadedManifests?.manifestModules ?? []}
        installations={installations}
        canManage={canManage}
      />
    </>
  );
}
