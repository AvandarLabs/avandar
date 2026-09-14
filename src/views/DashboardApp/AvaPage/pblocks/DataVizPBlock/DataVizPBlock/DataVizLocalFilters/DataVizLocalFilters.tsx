/**
 * Inline local-filter strip rendered above a DataViz chart. These are the
 * viz-scoped filter controls: the viewer-editable counterpart to the
 * editor-time `LocalFiltersPField`.
 *
 * Local filters compose with global ones at SQL-build time (see
 * `useApplyDashboardFiltersToSql`); the strip itself is purely presentational
 * + state-management glue.
 */
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconRefresh } from "@tabler/icons-react";
import { DataVizLocalFilterInput } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizLocalFilters/DataVizLocalFilterInput";
import css from "./DataVizLocalFilters.module.css";
import type {
  LocalFilter,
  LocalFilterStateApi,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type { ReactNode } from "react";

type Props = {
  localFilters: readonly LocalFilter[];
  state: LocalFilterStateApi;
};

/** Renders the configured local filters for one data visualization. */
export function DataVizLocalFilters({ localFilters, state }: Props): ReactNode {
  if (localFilters.length === 0) {
    return null;
  }

  const hasActiveValue = localFilters.some((localFilter) => {
    const filterValue = state.valuesById[localFilter.id];
    if (filterValue === undefined) {
      return false;
    }
    if (Array.isArray(filterValue)) {
      return filterValue.length > 0;
    }
    if (typeof filterValue === "string") {
      return filterValue.length > 0;
    }
    return false;
  });

  return (
    <Stack gap={6} p="sm" className={css.dataVizLocalFiltersContainer}>
      <Group gap={6} justify="space-between" align="center">
        <Group gap={6} c="dimmed">
          <IconAdjustmentsHorizontal size={14} />
          <Text size="xs" fw={500} tt="uppercase" lts={0.4}>
            <Trans>Filters for this chart</Trans>
          </Text>
        </Group>
        {hasActiveValue ? (
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<IconRefresh size={12} />}
            onClick={state.reset}
          >
            <Trans>Reset</Trans>
          </Button>
        ) : null}
      </Group>
      <Group gap="xs" align="end" wrap="wrap">
        {localFilters.map((localFilter) => {
          return (
            <DataVizLocalFilterInput
              key={localFilter.id}
              filter={localFilter}
              value={state.valuesById[localFilter.id]}
              onChange={(value) => {
                state.setValue({ filterId: localFilter.id, value });
              }}
            />
          );
        })}
      </Group>
    </Stack>
  );
}
