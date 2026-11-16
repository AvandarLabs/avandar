import { omit } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { DataSlotAttributeSelect } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeSelect";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  source: DataSlotSource;
  draft: PluginDataSlotBinding.Draft;
  onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
}>;

/**
 * The field pickers of a data slot panel, one per slot attribute in manifest
 * order, grouped and named after the slot so a screen reader hears which
 * records the fields belong to.
 */
export function DataSlotAttributeFields({
  slot,
  slotTitle,
  localize,
  source,
  draft,
  onDraftChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="sm" role="group" aria-label={t`Fields for ${slotTitle}`}>
      {Object.entries(slot.attributes).map(([attributeKey, attribute]) => {
        return (
          <DataSlotAttributeSelect
            key={attributeKey}
            attribute={attribute}
            attributeTitle={localize(attribute.title)}
            source={source}
            fieldId={draft.attributeMap[attributeKey]}
            onFieldIdChange={(fieldId) => {
              onDraftChange({
                ...draft,
                attributeMap:
                  fieldId === undefined
                    ? omit(draft.attributeMap, attributeKey)
                    : { ...draft.attributeMap, [attributeKey]: fieldId },
              });
            }}
          />
        );
      })}
    </Stack>
  );
}
