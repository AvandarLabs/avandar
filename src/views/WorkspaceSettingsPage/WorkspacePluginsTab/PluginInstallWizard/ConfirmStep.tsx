import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ConfirmDataSlotsSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
}>;

/**
 * The install wizard's last page: what installing does, the records each
 * data slot will read, and, once the footer's Install button has run, a
 * status line saying the plugin is installed.
 */
export function ConfirmStep({
  pluginName,
  manifestModule,
  wizard,
  installer,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <InstallWizardStepHeading>{t`Summary`}</InstallWizardStepHeading>
      <Text size="sm">
        {t`${pluginName} will be available to every member of this workspace.`}
      </Text>
      <ConfirmDataSlotsSummary
        manifestModule={manifestModule}
        draftsBySlotId={wizard.draftsBySlotId}
      />
      <Text size="sm" role="status">
        {installer.installation === undefined
          ? null
          : t`${pluginName} is installed.`}
      </Text>
    </Stack>
  );
}
