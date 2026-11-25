import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ConfirmContentSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentSummary";
import { ConfirmDataSlotsSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
  content: InstallWizardContent;
}>;

/**
 * The install wizard's last page: what installing does, the records each
 * data slot will read, and the datasets it imports. Once the footer's
 * Install button has run, a status line says the plugin is installed and
 * each dataset shows its import progress.
 */
export function ConfirmStep({
  pluginName,
  manifestModule,
  wizard,
  installer,
  content,
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
      <ConfirmContentSummary
        manifestModule={manifestModule}
        content={content}
      />
      <Text size="sm" role="status">
        {installer.installation === undefined
          ? null
          : t`${pluginName} is installed.`}
      </Text>
    </Stack>
  );
}
