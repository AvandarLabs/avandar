import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";

type Props = Readonly<{
  pluginName: string;
  installer: PluginInstaller;
}>;

/**
 * The install wizard's last page: what installing does, and, once the
 * footer's Install button has run, a status line saying the plugin is
 * installed.
 */
export function ConfirmStep({ pluginName, installer }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <InstallWizardStepHeading>{t`Summary`}</InstallWizardStepHeading>
      <Text size="sm">
        {t`${pluginName} will be available to every member of this workspace.`}
      </Text>
      <Text size="sm" role="status">
        {installer.installation === undefined
          ? null
          : t`${pluginName} is installed.`}
      </Text>
    </Stack>
  );
}
