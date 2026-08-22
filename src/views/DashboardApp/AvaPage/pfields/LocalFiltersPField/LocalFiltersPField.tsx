import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ReactElement } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { LocalFilterEditor } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor";

type Props = AvaPageFieldProps<readonly LocalFilter[]>;

function createLocalFilter(): LocalFilter {
  return {
    id: crypto.randomUUID(),
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
export function LocalFiltersPField({ value, onChange }: Props): ReactElement {
  const filters = value ?? [];

  const updateFilter = (filterIndex: number, filter: LocalFilter): void => {
    onChange(
      filters.map((currentFilter, currentFilterIndex) => {
        return currentFilterIndex === filterIndex ? filter : currentFilter;
      }),
    );
  };

  const removeFilter = (filterIndex: number): void => {
    onChange(
      filters.filter((_, currentFilterIndex) => {
        return currentFilterIndex !== filterIndex;
      }),
    );
  };

  const addFilter = (): void => {
    onChange([...filters, createLocalFilter()]);
  };

  return (
    <Stack gap="xs">
      {filters.length === 0 ? (
        <Text size="xs" c="dimmed">
          <Trans>
            No filters yet. Add one to let viewers refine this chart without
            affecting any others.
          </Trans>
        </Text>
      ) : (
        <Stack gap="xs">
          {filters.map((filter, filterIndex) => {
            return (
              <LocalFilterEditor
                key={filter.id}
                filter={filter}
                onChange={(updatedFilter) => {
                  updateFilter(filterIndex, updatedFilter);
                }}
                onRemove={() => {
                  removeFilter(filterIndex);
                }}
              />
            );
          })}
        </Stack>
      )}
      <Button
        size="compact-xs"
        leftSection={<IconPlus size={12} />}
        onClick={addFilter}
        variant="light"
      >
        <Trans>Add filter</Trans>
      </Button>
    </Stack>
  );
}
