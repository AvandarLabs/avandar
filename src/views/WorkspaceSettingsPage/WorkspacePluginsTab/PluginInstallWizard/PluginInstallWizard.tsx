import { Stack } from "@mantine/core";
import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { InstallWizardFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter";
import { InstallWizardPageContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent";
import { InstallWizardStepper } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper";
import { useInstallPlugin } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import { useInstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
import { useInstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import { useKeepModalOpenWhile } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;

  /** Closes the modal the wizard is in. */
  onClose: () => void;

  /**
   * The id of the modal the wizard is in. While content imports run, the
   * wizard turns off that modal's Escape key and close button, so the
   * outcome of an import is never lost to a closed wizard.
   */
  modalId?: string;
}>;

/**
 * Whether the wizard's current page lets the admin go on: a data slot's page
 * does once its binding is complete, and every other page always does.
 */
function useCanGoNext(wizard: InstallWizardState): boolean {
  const slotPage = wizard.page.step === "dataSlots" ? wizard.page : undefined;
  const { status } = useDataSlotDraftStatus({
    slot: slotPage?.slot,
    draft:
      slotPage === undefined
        ? undefined
        : getOwnValue(wizard.draftsBySlotId, slotPage.slotId),
  });
  return slotPage === undefined || status?.kind === "bound";
}

/**
 * The plugin install wizard: Review, then the steps the manifest needs, then
 * Confirm, which installs the plugin and then imports the chosen content.
 * Opened in a modal by `openPluginInstallWizard` from a plugin's settings
 * card.
 */
export function PluginInstallWizard({
  pluginName,
  manifestModule,
  onClose,
  modalId,
}: Props): JSX.Element {
  const wizard = useInstallWizardState(manifestModule.manifest);
  const content = useInstallWizardContent({
    manifestModule,
    chosenContentIds: wizard.chosenContentIds,
  });
  const installer = useInstallPlugin({
    pluginName,
    manifest: manifestModule.manifest,
    onInstalled: () => {
      void content.contentImports.importItems(content.itemsToImport);
    },
  });
  useKeepModalOpenWhile(content.contentImports.isImporting, modalId);
  const canGoNext = useCanGoNext(wizard);
  return (
    <Stack gap="lg">
      <InstallWizardStepper steps={wizard.steps} activeStep={wizard.page.step}>
        <Stack key={wizard.page.key} pt="md">
          <InstallWizardPageContent
            pluginName={pluginName}
            manifestModule={manifestModule}
            wizard={wizard}
            installer={installer}
            content={content}
          />
        </Stack>
      </InstallWizardStepper>
      <InstallWizardFooter
        wizard={wizard}
        installer={installer}
        canGoNext={canGoNext}
        isImportingContent={content.contentImports.isImporting}
        onInstall={() => {
          installer.install(wizard.bindings);
        }}
        onClose={onClose}
      />
    </Stack>
  );
}
