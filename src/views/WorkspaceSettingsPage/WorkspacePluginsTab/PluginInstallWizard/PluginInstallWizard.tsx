import { Stack } from "@mantine/core";
import { InstallWizardFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter";
import { InstallWizardPageContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent";
import { InstallWizardStepper } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper";
import { useInstallPlugin } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import { useInstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;

  /** Closes the modal the wizard is in. */
  onClose: () => void;
}>;

/**
 * The plugin install wizard: Review, then the steps the manifest needs, then
 * Confirm, which installs the plugin. Opened in a modal by
 * `openPluginInstallWizard` from a plugin's settings card.
 */
export function PluginInstallWizard({
  pluginName,
  manifestModule,
  onClose,
}: Props): JSX.Element {
  const wizard = useInstallWizardState(manifestModule.manifest);
  const installer = useInstallPlugin({
    pluginName,
    manifest: manifestModule.manifest,
  });
  return (
    <Stack gap="lg">
      <InstallWizardStepper steps={wizard.steps} activeStep={wizard.page.step}>
        <Stack key={wizard.page.key} pt="md">
          <InstallWizardPageContent
            pluginName={pluginName}
            manifestModule={manifestModule}
            wizard={wizard}
            installer={installer}
          />
        </Stack>
      </InstallWizardStepper>
      <InstallWizardFooter
        wizard={wizard}
        installer={installer}
        onInstall={() => {
          installer.install([]);
        }}
        onClose={onClose}
      />
    </Stack>
  );
}
