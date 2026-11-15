import { useLingui } from "@lingui/react/macro";
import { Group, Select, Text } from "@mantine/core";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  sourceColumn: string;
  /** The layout's first dataset's columns, in column order. */
  sourceColumns: ReadonlyArray<{ name: string; dataType: AvaDataType.T }>;
  profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  onChange: (sourceColumn: string) => void;
};

/** The column's most common non-blank value, when profiling listed values. */
function _getExampleValue(
  profile: ColumnProfile.T | undefined,
): string | undefined {
  return profile?.values?.find((item) => {
    return item.value.trim() !== "";
  })?.value;
}

/**
 * The layout column this column is filled from. Each option shows an
 * example of what that column holds, and the chosen one's example sits
 * under the field.
 */
export function SourceColumnSelect(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { profilesBySourceColumn } = props;
  const example = _getExampleValue(
    profilesBySourceColumn.get(props.sourceColumn),
  );
  return (
    <Select
      size="xs"
      label={t`Column`}
      searchable
      allowDeselect={false}
      value={props.sourceColumn}
      description={
        example === undefined ? undefined : t`For example: ${example}`
      }
      data={props.sourceColumns.map((column) => {
        return { value: column.name, label: column.name };
      })}
      renderOption={({ option }) => {
        const optionExample = _getExampleValue(
          profilesBySourceColumn.get(option.value),
        );
        return (
          <Group gap="xs" wrap="nowrap" justify="space-between" w="100%">
            <Text size="xs">{option.label}</Text>
            {optionExample === undefined ? null : (
              <Text size="xs" c="dimmed" truncate maw="50%">
                {optionExample}
              </Text>
            )}
          </Group>
        );
      }}
      onChange={(value) => {
        if (value) {
          props.onChange(value);
        }
      }}
    />
  );
}
