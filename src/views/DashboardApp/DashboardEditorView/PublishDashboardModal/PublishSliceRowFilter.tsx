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
              if (kind === "enum") {
                onChange({
                  id: rowFilter.id,
                  kind: "enum",
                  columnName: rowFilter.columnName,
                  values: [],
                });
              } else if (kind === "range_number") {
                onChange({
                  id: rowFilter.id,
                  kind: "range_number",
                  columnName: rowFilter.columnName,
                });
              } else if (kind === "range_date") {
                onChange({
                  id: rowFilter.id,
                  kind: "range_date",
                  columnName: rowFilter.columnName,
                });
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
        <TagsInput
          placeholder={t`Enter values; press Enter after each`}
          value={[...rowFilter.values]}
          onChange={(values) => {
            onChange({ ...rowFilter, values });
          }}
        />
      : rowFilter.kind === "range_number" ?
        <Group gap="xs">
          <NumberInput
            placeholder={t`Min`}
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
            placeholder={t`Max`}
            value={rowFilter.max ?? ""}
            onChange={(maximum) => {
              onChange({
                ...rowFilter,
                max: typeof maximum === "number" ? maximum : undefined,
              });
            }}
          />
        </Group>
      : <Group gap="xs">
          <TextInput
            placeholder={t`Start (e.g. 2024-01-01)`}
            value={rowFilter.start ?? ""}
            onChange={(event) => {
              onChange({ ...rowFilter, start: event.currentTarget.value });
            }}
          />
          <Text size="xs" c="dimmed">
            <Trans>to</Trans>
          </Text>
          <TextInput
            placeholder={t`End (e.g. 2024-12-31)`}
            value={rowFilter.end ?? ""}
            onChange={(event) => {
              onChange({ ...rowFilter, end: event.currentTarget.value });
            }}
          />
        </Group>
      }
    </Box>
  );
}
