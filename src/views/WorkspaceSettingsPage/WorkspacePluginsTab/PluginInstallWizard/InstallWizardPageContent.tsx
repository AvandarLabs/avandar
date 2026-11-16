import { match } from "ts-pattern";
import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
import { DataSlotsStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep";
import { ReviewStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { ReactNode } from "react";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
}>;

/** The page `PluginInstallWizard` shows for its current step. */
export function InstallWizardPageContent({
  pluginName,
  manifestModule,
  wizard,
  installer,
}: Props): ReactNode {
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
          draft={wizard.draftsBySlotId[slotId]}
          onDraftChange={(draft) => {
            wizard.setSlotDraft(slotId, draft);
          }}
        />
      );
    })
    .with({ step: "content" }, () => {
      return null;
    })
    .with({ step: "confirm" }, () => {
      return (
        <ConfirmStep
          pluginName={pluginName}
          manifestModule={manifestModule}
          wizard={wizard}
          installer={installer}
        />
      );
    })
    .exhaustive();
}
