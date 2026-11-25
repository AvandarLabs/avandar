import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataSlotCheckPreview } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview";
import { DataSlotAttributeFields } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeFields";
import { DataSlotSourceSelect } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotSourceSelect";
import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slotId: string;
  slot: PluginDataSlot;

  /** The slot's title, already localized. */
  slotTitle: string;

  /** Localizes the plugin's `%key%` strings, such as attribute titles. */
  localize: (value: string) => string;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/**
 * Binds one data slot: a picker for the case type or dataset it reads, then
 * one field picker per slot attribute, then a check of what the mapping
 * reads once every required attribute has a field. Used by the install
 * wizard's Data slots step and by the modal that rebinds a slot later.
 */
export function DataSlotPanel(props: Props): JSX.Element {
  const { slotId, slot, slotTitle, localize, draft, onDraftChange } = props;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const sourceOptions = useDataSlotSourceOptions(workspace.id);
  const { source, isLoadingSource, status } = useDataSlotDraftStatus({
    slot,
    draft,
  });
  return (
    <Stack gap="md">
      <DataSlotSourceSelect
        slotId={slotId}
        slot={slot}
        sourceOptions={sourceOptions}
        draft={draft}
        onDraftChange={onDraftChange}
      />
      {isLoadingSource ? (
        <Loader size="sm" role="status" aria-label={t`Loading fields`} />
      ) : null}
      {source === undefined || draft === undefined ? null : (
        <DataSlotAttributeFields
          {...{ slot, slotTitle, localize, source, draft, onDraftChange }}
        />
      )}
      {source === undefined || status?.kind !== "bound" ? null : (
        <DataSlotCheckPreview
          {...{ slot, slotTitle, localize, source }}
          fieldsByAttributeKey={status.fieldsByAttributeKey}
        />
      )}
    </Stack>
  );
}
