import { isDefined, propEq } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { LocalFilterEditor } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor";
import { useDataVizAuthoring } from "../useDataVizAuthoring/useDataVizAuthoring";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type {
  LegacyLocalFilter,
  LocalFilter,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ReactElement } from "react";

type Props = { auth: StructuredQueryAuth };

function createLocalFilter(columnId: QueryColumn.Id): LocalFilter {
  return {
    id: crypto.randomUUID(),
    label: "",
    columnId,
    mode: "select_single",
    optionsRaw: "",
    defaultValue: "",
  };
}

type Authoring = ReturnType<typeof useDataVizAuthoring>;

/**
 * Writes local filters back to the selected block. A block that still saves
 * its filters by column name gets each filter's column ID turned back into
 * the column's name.
 */
function saveLocalFilters(
  options: Readonly<{
    authoring: Authoring;
    columns: readonly QueryResult.ColumnWithId[];
    localFilters: ReadonlyArray<LocalFilter | LegacyLocalFilter>;
  }>,
): void {
  const { authoring, columns, localFilters } = options;
  if (authoring.props.columnBindingVersion === 0) {
    const legacyFilters = localFilters.map((filter) => {
      if ("columnName" in filter) {
        return filter;
      }
      const column = columns.find(propEq("id", filter.columnId));
      if (!column) {
        return undefined;
      }
      const { columnId: _columnId, ...definition } = filter;
      return { ...definition, columnName: column.name };
    });
    if (legacyFilters.every(isDefined)) {
      authoring.updateColumnNameProps({ localFilters: legacyFilters });
    }
  } else if (
    localFilters.every((filter): filter is LocalFilter => {
      return "columnId" in filter;
    })
  ) {
    authoring.update({ localFilters });
  }
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
export function LocalFiltersPField({ auth }: Props): ReactElement {
  const authoring = useDataVizAuthoring(auth);
  const filters =
    authoring.props.columnBindingVersion === 0
      ? authoring.props.localFilters
      : (authoring.runtime?.localFilters ?? []);
  const columns = authoring.schema?.columns ?? [];
  // A local filter's IN, ILIKE, or = fails on a list column.
  const filterableColumns = columns.filter((column) => {
    return !QueryResult.isListColumn(column);
  });
  const onChange = (
    localFilters: ReadonlyArray<LocalFilter | LegacyLocalFilter>,
  ): void => {
    saveLocalFilters({ authoring, columns, localFilters });
  };

  const updateFilter = (
    filterIndex: number,
    filter: LocalFilter | LegacyLocalFilter,
  ): void => {
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
    const firstColumn = filterableColumns[0];
    if (firstColumn) {
      onChange([...filters, createLocalFilter(firstColumn.id)]);
    }
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
                columns={filterableColumns}
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
        disabled={filterableColumns.length === 0}
        variant="light"
      >
        <Trans>Add filter</Trans>
      </Button>
    </Stack>
  );
}
