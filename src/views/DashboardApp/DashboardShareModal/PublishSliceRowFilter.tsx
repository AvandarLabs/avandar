import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Group,
  NumberInput,
  SegmentedControl,
  TagsInput,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

type Props = {
  rowFilter: PublishSliceConfig.RowFilter;
  columnType: AvaDataType.T;
  onChange: (rowFilter: PublishSliceConfig.RowFilter) => void;
  onRemove: () => void;
};

/** The one arm of the row-filter union that carries the given kind. */
type RowFilterOfKind<Kind extends PublishSliceConfig.RowFilter["kind"]> =
  Extract<PublishSliceConfig.RowFilter, { kind: Kind }>;

type RenderEnumFilterOptions = {
  rowFilter: RowFilterOfKind<"enum">;
  valuesPlaceholder: string;
  onChange: Props["onChange"];
};

type RenderNumberRangeFilterOptions = {
  rowFilter: RowFilterOfKind<"range_number">;
  minPlaceholder: string;
  maxPlaceholder: string;
  onChange: Props["onChange"];
};

type RenderDateRangeFilterOptions = {
  rowFilter: RowFilterOfKind<"range_date">;
  startPlaceholder: string;
  endPlaceholder: string;
  onChange: Props["onChange"];
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

function _renderEnumFilter(
  options: Readonly<RenderEnumFilterOptions>,
): ReactNode {
  const { rowFilter, valuesPlaceholder, onChange } = options;
  return (
    <TagsInput
      placeholder={valuesPlaceholder}
      value={[...rowFilter.values]}
      onChange={(values) => {
        onChange({ ...rowFilter, values });
      }}
    />
  );
}

function _renderNumberRangeFilter(
  options: Readonly<RenderNumberRangeFilterOptions>,
): ReactNode {
  const { rowFilter, minPlaceholder, maxPlaceholder, onChange } = options;
  return (
    <Group gap="xs">
      <NumberInput
        placeholder={minPlaceholder}
        value={rowFilter.min ?? ""}
        onChange={(minimum) => {
          onChange({
            ...rowFilter,
            min: typeof minimum === "number" ? minimum : undefined,
          });
        }}
      />
      <Text size="xs" c="dimmed">
        <Trans>to</Trans>
      </Text>
      <NumberInput
        placeholder={maxPlaceholder}
        value={rowFilter.max ?? ""}
        onChange={(maximum) => {
          onChange({
            ...rowFilter,
            max: typeof maximum === "number" ? maximum : undefined,
          });
        }}
      />
    </Group>
  );
}

function _renderDateRangeFilter(
  options: Readonly<RenderDateRangeFilterOptions>,
): ReactNode {
  const { rowFilter, startPlaceholder, endPlaceholder, onChange } = options;
  return (
    <Group gap="xs">
      <TextInput
        placeholder={startPlaceholder}
        value={rowFilter.start ?? ""}
        onChange={(event) => {
          onChange({ ...rowFilter, start: event.currentTarget.value });
        }}
      />
      <Text size="xs" c="dimmed">
        <Trans>to</Trans>
      </Text>
      <TextInput
        placeholder={endPlaceholder}
        value={rowFilter.end ?? ""}
        onChange={(event) => {
          onChange({ ...rowFilter, end: event.currentTarget.value });
        }}
      />
    </Group>
  );
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
              ...(AvaDataType.isNumeric(columnType) ?
                [{ value: "range_number", label: t`Number range` }]
              : []),
              ...(AvaDataType.isTemporal(columnType) ?
                [{ value: "range_date", label: t`Date range` }]
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
      {rowFilter.kind === "enum" ?
        _renderEnumFilter({
          rowFilter,
          valuesPlaceholder: t`Enter values; press Enter after each`,
          onChange,
        })
      : rowFilter.kind === "range_number" ?
        _renderNumberRangeFilter({
          rowFilter,
          minPlaceholder: t`Min`,
          maxPlaceholder: t`Max`,
          onChange,
        })
      : _renderDateRangeFilter({
          rowFilter,
          startPlaceholder: t`Start (e.g. 2024-01-01)`,
          endPlaceholder: t`End (e.g. 2024-12-31)`,
          onChange,
        })
      }
    </Box>
  );
}
