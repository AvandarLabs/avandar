import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useDataSlotSourceLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  draftsBySlotId: InstallWizardState["draftsBySlotId"];
}>;

/**
 * The Confirm step's list of the records each data slot will read, such as
 * "Cases: Case type: Measles cases", or that a skipped slot has none yet.
 * Shows nothing for a plugin without data slots.
 */
export function ConfirmDataSlotsSummary({
  manifestModule,
  draftsBySlotId,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const sourceLabels = useDataSlotSourceLabels();
  const { concepts, datasets } = useDataSlotSourceOptions(
    useCurrentWorkspace().id,
  );
  const slots = Object.entries(manifestModule.manifest.dataSlots);
  if (slots.length === 0) {
    return null;
  }
  const getSourceLabel = (slotId: string): string => {
    const draft = getOwnValue(draftsBySlotId, slotId);
    if (draft === undefined) {
      return t`not chosen yet`;
    }
    const sources = draft.sourceType === "concept" ? concepts : datasets;
    const sourceId = draft.conceptId ?? draft.datasetId;
    const name = sources.find((source) => {
      return source.id === sourceId;
    })?.name;
    return sourceLabels[draft.sourceType](name ?? t`unavailable`);
  };
  return (
    <PluginDetailsSection title={t`Records it reads`} headingOrder={4}>
      <List size="sm">
        {slots.map(([slotId, slot]) => {
          const slotTitle = localize(slot.title);
          const sourceLabel = getSourceLabel(slotId);
          return (
            <List.Item
              key={slotId}
            >{t`${slotTitle}: ${sourceLabel}`}</List.Item>
          );
        })}
      </List>
    </PluginDetailsSection>
  );
}
