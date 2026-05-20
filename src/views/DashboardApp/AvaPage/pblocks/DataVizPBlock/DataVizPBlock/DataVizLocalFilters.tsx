/**
 * Inline local-filter strip rendered above a DataViz chart. These are the
 * viz-scoped filter controls — the viewer-editable counterpart to the
 * editor-time `LocalFiltersPField`.
 *
 * Local filters compose with global ones at SQL-build time (see
 * `useApplyDashboardFiltersToSql`); the strip itself is purely presentational
 * + state-management glue.
 */
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAdjustmentsHorizontal, IconRefresh } from "@tabler/icons-react";
import { parseLocalFilterOptions } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type {
  LocalFilter,
  LocalFilterStateApi,
  LocalFilterValue,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";

type Props = {
  localFilters: readonly LocalFilter[];
  state: LocalFilterStateApi;
};

export function DataVizLocalFilters({
  localFilters,
  state,
}: Props): JSX.Element | null {
  if (localFilters.length === 0) return null;

  const hasActiveValue = localFilters.some((f) => {
    const v = state.valuesById[f.id];
    if (v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.length > 0;
    return false;
  });

  return (
    <Stack
      gap={6}
      p="sm"
      style={{
        border: "1px dashed var(--mantine-color-gray-3)",
        borderRadius: 6,
        background: "var(--mantine-color-gray-0)",
      }}
    >
      <Group gap={6} justify="space-between" align="center">
        <Group gap={6} c="dimmed">
          <IconAdjustmentsHorizontal size={14} />
          <Text size="xs" fw={500} tt="uppercase" lts={0.4}>
            <Trans>Filters for this chart</Trans>
          </Text>
        </Group>
        {hasActiveValue ?
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<IconRefresh size={12} />}
            onClick={state.reset}
          >
            <Trans>Reset</Trans>
          </Button>
        : null}
      </Group>
      <Group gap="xs" align="end" wrap="wrap">
        {localFilters.map((f) => {
          return (
            <LocalFilterInput
              key={f.id}
              filter={f}
              value={state.valuesById[f.id]}
              onChange={(v) => {
                state.setValue(f.id, v);
              }}
            />
          );
        })}
      </Group>
    </Stack>
  );
}

function LocalFilterInput({
  filter,
  value,
  onChange,
}: {
  filter: LocalFilter;
  value: LocalFilterValue;
  onChange: (next: LocalFilterValue) => void;
}): JSX.Element {
  const { t } = useLingui();
  const options = parseLocalFilterOptions(filter.optionsRaw);

  if (filter.mode === "select_multi") {
    return (
      <MultiSelect
        miw={180}
        size="xs"
        label={filter.label}
        placeholder={t`All`}
        data={options}
        clearable
        searchable
        value={[...((value as readonly string[]) ?? [])]}
        onChange={(v) => {
          onChange(v);
        }}
      />
    );
  }

  if (filter.mode === "contains") {
    return (
      <TextInput
        miw={180}
        size="xs"
        label={filter.label}
        placeholder={t`Contains…`}
        value={(value as string) ?? ""}
        onChange={(e) => {
          onChange(e.currentTarget.value);
        }}
      />
    );
  }

  return (
    <Select
      miw={180}
      size="xs"
      label={filter.label}
      placeholder={t`All`}
      data={options}
      clearable
      searchable
      value={(value as string) ?? null}
      onChange={(v) => {
        onChange(v ?? undefined);
      }}
    />
  );
}
