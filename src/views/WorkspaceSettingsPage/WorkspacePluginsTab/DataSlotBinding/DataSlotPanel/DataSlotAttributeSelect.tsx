import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import { useDataSlotAttributeTypeLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlotAttribute } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  attribute: PluginDataSlotAttribute;

  /** The attribute's title, already localized. */
  attributeTitle: string;
  source: DataSlotSource;
  fieldId: string | undefined;
  onFieldIdChange: (fieldId: string | undefined) => void;
}>;

/**
 * One row of a data slot panel: the field of the chosen source that fills
 * one slot attribute. It is labeled by the attribute's title, described by
 * its type, starred when required, and lists only fields of a type that
 * fits. An optional attribute can be cleared.
 */
export function DataSlotAttributeSelect({
  attribute,
  attributeTitle,
  source,
  fieldId,
  onFieldIdChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const typeLabels = useDataSlotAttributeTypeLabels();
  const options = source.fields
    .filter((field) => {
      return isDataTypeAcceptedBySlotAttribute({
        type: attribute.type,
        dataType: field.dataType,
      });
    })
    .map((field) => {
      return { value: field.id, label: field.label };
    });
  return (
    <Select
      label={attributeTitle}
      description={typeLabels[attribute.type]}
      required={attribute.required}
      clearable={!attribute.required}
      allowDeselect={!attribute.required}
      disabled={options.length === 0}
      placeholder={
        options.length === 0 ? t`No fields of this type` : t`Select a field`
      }
      data={options}
      value={fieldId ?? null}
      onChange={(value) => {
        onFieldIdChange(value ?? undefined);
      }}
    />
  );
}
