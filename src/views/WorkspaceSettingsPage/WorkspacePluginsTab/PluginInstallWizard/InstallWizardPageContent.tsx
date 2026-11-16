import { match } from "ts-pattern";
import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
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
  return match(wizard.page.step)
    .with("review", () => {
      return <ReviewStep manifestModule={manifestModule} />;
    })
    .with("dataSlots", "content", () => {
      return null;
    })
    .with("confirm", () => {
      return <ConfirmStep pluginName={pluginName} installer={installer} />;
    })
    .exhaustive();
}
