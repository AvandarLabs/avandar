import { match } from "ts-pattern";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
import { ContentStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ContentStep";
import { DataSlotsStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep";
import { ReviewStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { ReactNode } from "react";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
  content: InstallWizardContent;
}>;

/** The page `PluginInstallWizard` shows for its current step. */
export function InstallWizardPageContent(props: Props): ReactNode {
  const { pluginName, manifestModule, wizard, content } = props;
  return match(wizard.page)
    .with({ step: "review" }, () => {
      return <ReviewStep manifestModule={manifestModule} />;
    })
    .with({ step: "dataSlots" }, ({ slotId, slot }) => {
      return (
        <DataSlotsStep
          pluginName={pluginName}
          manifestModule={manifestModule}
          slotId={slotId}
          slot={slot}
          draft={getOwnValue(wizard.draftsBySlotId, slotId)}
          onDraftChange={(draft) => {
            wizard.setSlotDraft(slotId, draft);
          }}
        />
      );
    })
    .with({ step: "content" }, () => {
      return (
        <ContentStep
          manifestModule={manifestModule}
          chosenContentIds={wizard.chosenContentIds}
          onIsChosenChange={wizard.setIsContentChosen}
          importedContent={content.importedContent}
        />
      );
    })
    .with({ step: "confirm" }, () => {
      return <ConfirmStep {...props} />;
    })
    .exhaustive();
}
