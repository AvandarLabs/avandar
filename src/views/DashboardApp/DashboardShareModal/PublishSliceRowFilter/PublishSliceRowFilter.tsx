import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Box, Group, SegmentedControl, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { DateRangeFilterInput } from "@/views/DashboardApp/DashboardShareModal/PublishSliceRowFilter/DateRangeFilterInput";
import { EnumFilterInput } from "@/views/DashboardApp/DashboardShareModal/PublishSliceRowFilter/EnumFilterInput";
import { NumberRangeFilterInput } from "@/views/DashboardApp/DashboardShareModal/PublishSliceRowFilter/NumberRangeFilterInput";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

type Props = {
  rowFilter: PublishSliceConfig.RowFilter;
  columnType: AvaDataType.T;
  onChange: (rowFilter: PublishSliceConfig.RowFilter) => void;
  onRemove: () => void;
};

/**
 * The filter a segmented-control pick produces.
 *
 * Keeps the filter's identity (`id` and `columnName`) and drops the previous
 * kind's operands, which do not carry over: an enum's values say nothing about
 * a number range's bounds.
 *
 * @returns `undefined` for a kind the control never offers, so the caller
 *   leaves the filter untouched rather than writing a malformed one.
 */
function _getRowFilterForKind(
  options: Readonly<{
    kind: string;
    rowFilter: PublishSliceConfig.RowFilter;
  }>,
): PublishSliceConfig.RowFilter | undefined {
  const { kind, rowFilter } = options;
  const identity = { id: rowFilter.id, columnName: rowFilter.columnName };
  if (kind === "enum") {
    return { ...identity, kind: "enum", values: [] };
  }
  if (kind === "range_number") {
    return { ...identity, kind: "range_number" };
  }
  if (kind === "range_date") {
    return { ...identity, kind: "range_date" };
  }
  return undefined;
}

/** Edits one custom publication row filter. */
export function PublishSliceRowFilter({
  rowFilter,
  columnType,
  onChange,
  onRemove,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Box
      p="xs"
      style={{
        borderRadius: 6,
        border: "1px solid var(--mantine-color-gray-3)",
        background: "var(--mantine-color-gray-0)",
      }}
    >
      <Group justify="space-between" mb={4}>
        <Group gap={6}>
          <Text size="sm" fw={500}>
            {rowFilter.columnName}
          </Text>
          <SegmentedControl
            size="xs"
            value={rowFilter.kind}
            data={[
              { value: "enum", label: t`Values` },
              ...(AvaDataType.isNumeric(columnType)
                ? [{ value: "range_number", label: t`Number range` }]
                : []),
              ...(AvaDataType.isTemporal(columnType)
                ? [{ value: "range_date", label: t`Date range` }]
                : []),
            ]}
            onChange={(kind) => {
              const nextRowFilter = _getRowFilterForKind({ kind, rowFilter });
              if (nextRowFilter !== undefined) {
                onChange(nextRowFilter);
              }
            }}
          />
        </Group>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={onRemove}
          aria-label={t`Remove row filter`}
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
      {rowFilter.kind === "enum" ? (
        <EnumFilterInput
          rowFilter={rowFilter}
          valuesPlaceholder={t`Enter values; press Enter after each`}
          onChange={onChange}
        />
      ) : rowFilter.kind === "range_number" ? (
        <NumberRangeFilterInput
          rowFilter={rowFilter}
          minPlaceholder={t`Min`}
          maxPlaceholder={t`Max`}
          onChange={onChange}
        />
      ) : (
        <DateRangeFilterInput
          rowFilter={rowFilter}
          startPlaceholder={t`Start (e.g. 2024-01-01)`}
          endPlaceholder={t`End (e.g. 2024-12-31)`}
          onChange={onChange}
        />
      )}
    </Box>
  );
}
