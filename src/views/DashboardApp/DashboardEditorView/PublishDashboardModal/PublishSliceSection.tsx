import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Radio,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconDatabase, IconShieldLock, IconTrash } from "@tabler/icons-react";
import { isNonEmptyArray, prop, where } from "@utils";
import { useMemo } from "react";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { extractReferencedColumns } from "@/clients/dashboards/sliceBuilder";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  DashboardPublishConfig,
  PublishSliceConfig,
  PublishSliceRowFilter,
} from "$/models/Dashboard/PublishSliceConfig";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

type Props = {
  dashboard: Dashboard.T;
  publishConfig: DashboardPublishConfig;
  onChange: (next: DashboardPublishConfig) => void;
};

type TranslateFn = ReturnType<typeof useLingui>["t"];

function _getModeDescriptions(
  t: TranslateFn,
): Record<PublishSliceConfig["mode"], string> {
  return {
    queried: t`Publish only the columns your dashboard reads. Narrowest, most private.`,
    all_columns: t`Publish every column, all rows. Maximum flexibility for viewers, maximum exposure.`,
    custom: t`Pick columns and add row constraints (enum, number range, date range).`,
  };
}

type DatasetSummary = {
  id: DatasetId;
  name: string;
  columns: readonly DatasetColumnRead[];
  queriedColumns: readonly string[];
  treatAsAllColumns: boolean;
};

function _isNumericType(t: AvaDataType.T): boolean {
  return t === "bigint" || t === "double";
}

function _isDateLikeType(t: AvaDataType.T): boolean {
  return t === "date" || t === "timestamp" || t === "time";
}

/**
 * Slice picker. Renders one accordion item per dataset the dashboard reads.
 * Each item lets the publisher pick a mode (queried / all_columns / custom)
 * and, in custom mode, pick columns + add row filters.
 */
export function PublishSliceSection({
  dashboard,
  publishConfig,
  onChange,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();

  const datasetIdCandidates = useMemo(() => {
    return extractDatasetIdsFromDashboardConfig(
      dashboard.config,
    ) as DatasetId[];
  }, [dashboard.config]);

  const [datasets] = DatasetClient.useGetAll({
    where: {
      id: { in: datasetIdCandidates },
      workspace_id: { eq: workspace.id },
    },
    useQueryOptions: { enabled: isNonEmptyArray(datasetIdCandidates) },
  });

  const datasetIds = useMemo(() => {
    return (datasets ?? []).map(prop("id"));
  }, [datasets]);

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "in", datasetIds),
    useQueryOptions: { enabled: isNonEmptyArray(datasetIds) },
  });

  const referenced = useMemo(() => {
    return extractReferencedColumns(dashboard.config, datasetIds);
  }, [dashboard.config, datasetIds]);

  const summaries: readonly DatasetSummary[] = useMemo(() => {
    if (!datasets) return [];
    return datasets.map((d) => {
      const cols = (datasetColumns ?? []).filter((c) => {
        return c.datasetId === d.id;
      });
      const queried: string[] = Array.from(
        referenced.perDataset[d.id] ?? new Set<string>(),
      );
      return {
        id: d.id,
        name: d.name,
        columns: cols,
        queriedColumns: queried,
        treatAsAllColumns: referenced.unparseable.has(d.id),
      };
    });
  }, [datasets, datasetColumns, referenced]);

  if (datasetIdCandidates.length === 0) {
    return (
      <Stack gap={4}>
        <Title order={5} fw={600}>
          <Trans>Data scope</Trans>
        </Title>
        <Text size="xs" c="dimmed">
          <Trans>
            This dashboard doesn't reference any datasets — nothing to publish.
          </Trans>
        </Text>
      </Stack>
    );
  }

  const _update = (datasetId: DatasetId, next: PublishSliceConfig): void => {
    onChange({
      slices: { ...publishConfig.slices, [datasetId]: next },
    });
  };

  return (
    <Stack gap="xs">
      <Group gap={6} align="center">
        <IconShieldLock size={16} color="var(--mantine-color-blue-7)" />
        <Title order={5} fw={600}>
          <Trans>Data scope</Trans>
        </Title>
      </Group>
      <Text size="xs" c="dimmed">
        <Trans>
          Choose how much of each dataset to publish. The default — "Only
          what's queried" — uploads just the columns your visualizations read.
          Widen the scope if you've added viewer-editable filters and want
          viewers to be able to filter beyond your defaults.
        </Trans>
      </Text>

      <Accordion variant="separated" multiple defaultValue={[]}>
        {summaries.map((d) => {
          const slice =
            publishConfig.slices[d.id] ?? ({ mode: "queried" } as const);
          return (
            <Accordion.Item key={d.id} value={d.id}>
              <Accordion.Control icon={<IconDatabase size={16} />}>
                <Group gap="sm" wrap="nowrap">
                  <Text fw={500} size="sm">
                    {d.name}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      slice.mode === "queried" ? "teal"
                      : slice.mode === "all_columns" ?
                        "yellow"
                      : "blue"
                    }
                  >
                    {slice.mode === "queried" ?
                      <Trans>Narrowest</Trans>
                    : slice.mode === "all_columns" ?
                      <Trans>All columns</Trans>
                    : <Trans>Custom</Trans>}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SliceModeEditor
                  dataset={d}
                  slice={slice}
                  onChange={(next) => {
                    return _update(d.id, next);
                  }}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}

function SliceModeEditor({
  dataset,
  slice,
  onChange,
}: {
  dataset: DatasetSummary;
  slice: PublishSliceConfig;
  onChange: (next: PublishSliceConfig) => void;
}): JSX.Element {
  const { t } = useLingui();
  const modeDescriptions = _getModeDescriptions(t);
  return (
    <Stack gap="md">
      <Radio.Group
        value={slice.mode}
        onChange={(mode) => {
          if (mode === "queried") onChange({ mode: "queried" });
          else if (mode === "all_columns") onChange({ mode: "all_columns" });
          else
            onChange({
              mode: "custom",
              columns:
                slice.mode === "custom" ? slice.columns
                : dataset.queriedColumns.length > 0 ? dataset.queriedColumns
                : dataset.columns.map(prop("name")),
              rowFilters: slice.mode === "custom" ? slice.rowFilters : [],
            });
        }}
      >
        <Stack gap={6}>
          <Radio
            value="queried"
            label={t`Only what's queried (recommended)`}
            description={modeDescriptions.queried}
          />
          <Radio
            value="custom"
            label={t`Custom selection`}
            description={modeDescriptions.custom}
          />
          <Radio
            value="all_columns"
            label={t`Whole dataset`}
            description={modeDescriptions.all_columns}
          />
        </Stack>
      </Radio.Group>

      {slice.mode === "queried" ?
        <QueriedPreview dataset={dataset} />
      : null}

      {slice.mode === "custom" ?
        <CustomEditor dataset={dataset} slice={slice} onChange={onChange} />
      : null}
    </Stack>
  );
}

function QueriedPreview({ dataset }: { dataset: DatasetSummary }): JSX.Element {
  if (dataset.treatAsAllColumns) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          At least one query on this dataset uses <code>SELECT *</code> or
          couldn't be parsed safely, so all columns will be published.
        </Trans>
      </Text>
    );
  }
  const cols = dataset.queriedColumns;
  if (cols.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          No columns detected for this dataset. Falling back to all columns.
        </Trans>
      </Text>
    );
  }
  const numCols = cols.length;
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        <Plural
          value={numCols}
          one="Will publish # column:"
          other="Will publish # columns:"
        />
      </Text>
      <ScrollArea.Autosize mah={120}>
        <Group gap={4}>
          {cols.map((c) => {
            return (
              <Badge key={c} size="sm" variant="light" color="teal">
                {c}
              </Badge>
            );
          })}
        </Group>
      </ScrollArea.Autosize>
    </Stack>
  );
}

function CustomEditor({
  dataset,
  slice,
  onChange,
}: {
  dataset: DatasetSummary;
  slice: Extract<PublishSliceConfig, { mode: "custom" }>;
  onChange: (next: PublishSliceConfig) => void;
}): JSX.Element {
  const allColumnNames = useMemo(() => {
    return dataset.columns.map(prop("name"));
  }, [dataset.columns]);
  const filterableColumns = useMemo(() => {
    return dataset.columns.map((c) => {
      return {
        name: c.name,
        type: c.dataType,
      };
    });
  }, [dataset.columns]);

  const _setColumns = (cols: readonly string[]): void => {
    onChange({ ...slice, columns: cols });
  };
  const _setRowFilters = (rfs: readonly PublishSliceRowFilter[]): void => {
    onChange({ ...slice, rowFilters: rfs });
  };

  return (
    <Stack gap="md">
      <Stack gap={6}>
        <Group justify="space-between" align="end">
          <Text size="sm" fw={500}>
            <Trans>Columns</Trans>
          </Text>
          <Group gap="xs">
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                return _setColumns(allColumnNames);
              }}
            >
              <Trans>Select all</Trans>
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                return _setColumns(dataset.queriedColumns);
              }}
              disabled={dataset.queriedColumns.length === 0}
            >
              <Trans>Just what's queried</Trans>
            </Button>
          </Group>
        </Group>
        <ScrollArea.Autosize mah={200}>
          <Stack gap={2}>
            {dataset.columns.map((c) => {
              const checked = slice.columns.includes(c.name);
              const isQueried = dataset.queriedColumns.includes(c.name);
              return (
                <Checkbox
                  key={c.id}
                  label={
                    <Group gap={6}>
                      <Text size="sm">{c.name}</Text>
                      <Badge size="xs" variant="outline" color="neutral">
                        {c.dataType}
                      </Badge>
                      {isQueried ?
                        <Badge size="xs" variant="light" color="teal">
                          <Trans>queried</Trans>
                        </Badge>
                      : null}
                    </Group>
                  }
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(slice.columns);
                    if (e.currentTarget.checked) next.add(c.name);
                    else next.delete(c.name);
                    _setColumns(Array.from(next));
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>

      <Stack gap={6}>
        <Group justify="space-between" align="end">
          <Text size="sm" fw={500}>
            <Trans>Row filters</Trans>
          </Text>
          <AddRowFilterMenu
            columns={filterableColumns}
            onAdd={(rf) => {
              return _setRowFilters([...slice.rowFilters, rf]);
            }}
          />
        </Group>
        {slice.rowFilters.length === 0 ?
          <Text size="xs" c="dimmed">
            <Trans>
              No row filters. The slice will include every row in the dataset
              (for the selected columns).
            </Trans>
          </Text>
        : <Stack gap="xs">
            {slice.rowFilters.map((rf, idx) => {
              return (
                <RowFilterRow
                  key={`${rf.columnName}-${idx}`}
                  rowFilter={rf}
                  columnType={
                    filterableColumns.find((c) => {
                      return c.name === rf.columnName;
                    })?.type ?? "varchar"
                  }
                  onChange={(next) => {
                    const arr = slice.rowFilters.slice();
                    arr[idx] = next;
                    _setRowFilters(arr);
                  }}
                  onRemove={() => {
                    const arr = slice.rowFilters.slice();
                    arr.splice(idx, 1);
                    _setRowFilters(arr);
                  }}
                />
              );
            })}
          </Stack>
        }
      </Stack>
    </Stack>
  );
}

function AddRowFilterMenu({
  columns,
  onAdd,
}: {
  columns: ReadonlyArray<{ name: string; type: AvaDataType.T }>;
  onAdd: (rf: PublishSliceRowFilter) => void;
}): JSX.Element {
  const { t } = useLingui();
  return (
    <Select
      placeholder={t`+ Add row filter`}
      size="xs"
      searchable
      clearable={false}
      data={columns.map((c) => {
        return { value: c.name, label: c.name };
      })}
      onChange={(name) => {
        if (!name) return;
        const col = columns.find((c) => {
          return c.name === name;
        });
        if (!col) return;
        if (_isNumericType(col.type))
          onAdd({ kind: "range_number", columnName: name });
        else if (_isDateLikeType(col.type))
          onAdd({ kind: "range_date", columnName: name });
        else onAdd({ kind: "enum", columnName: name, values: [] });
      }}
      style={{ width: 220 }}
    />
  );
}

function RowFilterRow({
  rowFilter,
  columnType,
  onChange,
  onRemove,
}: {
  rowFilter: PublishSliceRowFilter;
  columnType: AvaDataType.T;
  onChange: (next: PublishSliceRowFilter) => void;
  onRemove: () => void;
}): JSX.Element {
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
              ...(_isNumericType(columnType) ?
                [{ value: "range_number", label: t`Number range` }]
              : []),
              ...(_isDateLikeType(columnType) ?
                [{ value: "range_date", label: t`Date range` }]
              : []),
            ]}
            onChange={(kind) => {
              if (kind === "enum")
                onChange({
                  kind: "enum",
                  columnName: rowFilter.columnName,
                  values: [],
                });
              else if (kind === "range_number")
                onChange({
                  kind: "range_number",
                  columnName: rowFilter.columnName,
                });
              else if (kind === "range_date")
                onChange({
                  kind: "range_date",
                  columnName: rowFilter.columnName,
                });
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
          onChange={(v) => {
            return onChange({ ...rowFilter, values: v });
          }}
        />
      : rowFilter.kind === "range_number" ?
        <Group gap="xs">
          <NumberInput
            placeholder={t`Min`}
            value={rowFilter.min ?? ""}
            onChange={(v) => {
              return onChange({
                ...rowFilter,
                min: typeof v === "number" ? v : undefined,
              });
            }}
          />
          <Text size="xs" c="dimmed">
            <Trans>to</Trans>
          </Text>
          <NumberInput
            placeholder={t`Max`}
            value={rowFilter.max ?? ""}
            onChange={(v) => {
              return onChange({
                ...rowFilter,
                max: typeof v === "number" ? v : undefined,
              });
            }}
          />
        </Group>
      : <Group gap="xs">
          <TextInput
            placeholder={t`Start (e.g. 2024-01-01)`}
            value={rowFilter.start ?? ""}
            onChange={(e) => {
              return onChange({ ...rowFilter, start: e.currentTarget.value });
            }}
          />
          <Text size="xs" c="dimmed">
            <Trans>to</Trans>
          </Text>
          <TextInput
            placeholder={t`End (e.g. 2024-12-31)`}
            value={rowFilter.end ?? ""}
            onChange={(e) => {
              return onChange({ ...rowFilter, end: e.currentTarget.value });
            }}
          />
        </Group>
      }
    </Box>
  );
}
