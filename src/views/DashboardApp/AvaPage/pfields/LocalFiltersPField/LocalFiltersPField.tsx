import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";

type Props = AvaPageFieldProps<readonly LocalFilter[]>;

function _useModeOptions(): ReadonlyArray<{
  value: LocalFilter["mode"];
  label: string;
}> {
  const { t } = useLingui();
  return [
    { value: "select_single", label: t`Single-select` },
    { value: "select_multi", label: t`Multi-select` },
    { value: "contains", label: t`Text contains` },
  ];
}

function _generateLocalFilterId(): string {
  // Stable enough for client-side keying; collisions across vizzes don't
  // matter since values are scoped per viz.
  return `lf_${Math.random().toString(36).slice(2, 10)}`;
}

function _makeEmptyLocalFilter(): LocalFilter {
  return {
    id: _generateLocalFilterId(),
    label: "",
    columnName: "",
    mode: "select_single",
    optionsRaw: "",
    defaultValue: "",
  };
}

/**
 * Puck side-panel field for managing a DataViz block's local filters.
 *
 * Renders one row per configured local filter with editable label /
 * column / mode / options / default, plus a "+ Add filter" button.
 * Local filters live in the block's prop tree alongside the SQL; they're
 * applied as a second subselect wrap on top of any subscribed global
 * filters at SQL-compose time.
 */
export function LocalFiltersPField({ value, onChange }: Props): JSX.Element {
  const filters = value ?? [];

  const _updateFilter = (idx: number, next: LocalFilter): void => {
    const arr = filters.slice();
    arr[idx] = next;
    onChange(arr);
  };

  const _removeFilter = (idx: number): void => {
    const arr = filters.slice();
    arr.splice(idx, 1);
    onChange(arr);
  };

  const _addFilter = (): void => {
    onChange([...filters, _makeEmptyLocalFilter()]);
  };

  return (
    <Stack gap="xs">
      {filters.length === 0 ?
        <Text size="xs" c="dimmed">
          <Trans>
            No filters yet. Add one to let viewers refine this chart without
            affecting any others.
          </Trans>
        </Text>
      : <Stack gap="xs">
          {filters.map((f, idx) => {
            return (
              <LocalFilterEditor
                key={f.id}
                filter={f}
                onChange={(next) => {
                  _updateFilter(idx, next);
                }}
                onRemove={() => {
                  _removeFilter(idx);
                }}
              />
            );
          })}
        </Stack>
      }
      <Button
        size="compact-xs"
        leftSection={<IconPlus size={12} />}
        onClick={_addFilter}
        variant="light"
      >
        <Trans>Add filter</Trans>
      </Button>
    </Stack>
  );
}

function LocalFilterEditor({
  filter,
  onChange,
  onRemove,
}: {
  filter: LocalFilter;
  onChange: (next: LocalFilter) => void;
  onRemove: () => void;
}): JSX.Element {
  const { t } = useLingui();
  const modeOptions = _useModeOptions();
  return (
    <Box
      p="xs"
      style={{
        borderRadius: 6,
        border: "1px solid var(--mantine-color-gray-3)",
        background: "var(--mantine-color-gray-0)",
      }}
    >
      <Stack gap={6}>
        <Group justify="space-between">
          <TextInput
            size="xs"
            placeholder={t`Label, e.g. Region`}
            value={filter.label}
            onChange={(e) => {
              onChange({ ...filter, label: e.currentTarget.value });
            }}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={onRemove}
            aria-label={t`Remove local filter`}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
        <TextInput
          size="xs"
          placeholder={t`Column name (must match SQL)`}
          value={filter.columnName}
          onChange={(e) => {
            onChange({ ...filter, columnName: e.currentTarget.value });
          }}
        />
        <Select
          size="xs"
          allowDeselect={false}
          data={modeOptions.map((o) => {
            return { value: o.value, label: o.label };
          })}
          value={filter.mode}
          onChange={(v) => {
            if (!v) return;
            onChange({ ...filter, mode: v as LocalFilter["mode"] });
          }}
        />
        {filter.mode !== "contains" ?
          <TextInput
            size="xs"
            placeholder={t`Values, comma-separated`}
            value={filter.optionsRaw}
            onChange={(e) => {
              onChange({ ...filter, optionsRaw: e.currentTarget.value });
            }}
          />
        : null}
        <TextInput
          size="xs"
          placeholder={
            filter.mode === "select_multi" ?
              t`Default values, comma-separated or JSON array`
            : t`Default value (optional)`
          }
          value={filter.defaultValue}
          onChange={(e) => {
            onChange({ ...filter, defaultValue: e.currentTarget.value });
          }}
        />
      </Stack>
    </Box>
  );
}
