import { isDefined, prop } from "@avandar/utils";
import { getQueryColumnIdFromQueryResultColumnName } from "$/models/queries/QueryResultColumnBindings/getQueryColumnIdFromQueryResultColumnName/getQueryColumnIdFromQueryResultColumnName";
import { makeAvaVizConfigFromUiVizConfig } from "$/models/vizs/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig";
import { makeUiVizConfigFromAvaVizConfig } from "$/models/vizs/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type {
  QueryResultColumnBindingIssue,
  QueryResultColumnBindings,
} from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  LegacyLocalFilter,
  LocalFilter,
} from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DataVizColumnBindingProps } from "./makeSavedColumnBindingsFromDataVizProps.types";

export type { DataVizColumnBindingProps } from "./makeSavedColumnBindingsFromDataVizProps.types";
type SavedDataVizColumnBindings = {
  props: DataVizColumnBindingProps;
  runtimeConfig: AvaVizConfig.T;
  issues: QueryResultColumnBindingIssue[];
  localFilters: readonly LocalFilter[];
};

function _getLocalFilterOutcome({
  filter,
  columns,
}: {
  filter: LegacyLocalFilter;
  columns: readonly QueryResult.ColumnWithId[];
}): {
  filter: LocalFilter | undefined;
  issue: QueryResultColumnBindingIssue | undefined;
} {
  const columnId = getQueryColumnIdFromQueryResultColumnName({
    name: filter.columnName,
    columns,
  });
  const { columnName: _columnName, ...definition } = filter;
  return {
    filter: columnId ? { ...definition, columnId } : undefined,
    issue: columnId
      ? undefined
      : {
          target: filter.id,
          reason: columns.some((column) => {
            return (
              column.name.toLowerCase() === filter.columnName.toLowerCase()
            );
          })
            ? "ambiguous"
            : "missing",
        },
  };
}

/**
 * Binds a chart's saved column references, `QueryResult` column names on a
 * version 0 chart or column IDs otherwise, to the column IDs of its query's
 * current `QueryResult` columns. A version 0 chart is upgraded only when every
 * name binds to exactly one column. Use it when a saved chart meets its live
 * query, for example to build the bindings it renders with.
 */
export function makeSavedColumnBindingsFromDataVizProps({
  props,
  schema,
}: Readonly<{
  props: Readonly<DataVizColumnBindingProps>;
  schema: Readonly<QueryResultColumnBindings>;
}>): SavedDataVizColumnBindings {
  if (props.columnBindingVersion === 1) {
    return {
      props: { ...props, columnBindings: schema.registry },
      runtimeConfig: props.vizConfig,
      localFilters: props.localFilters,
      issues: makeUiVizConfigFromAvaVizConfig({
        config: props.vizConfig,
        columns: schema.columns,
      }).issues,
    };
  }
  const vizConfigConversion = makeAvaVizConfigFromUiVizConfig({
    config: props.vizConfig,
    columns: schema.columns,
  });
  const outcomes = props.localFilters.map((filter) => {
    return _getLocalFilterOutcome({ filter, columns: schema.columns });
  });
  const issues = [
    ...vizConfigConversion.issues,
    ...outcomes.map(prop("issue")).filter(isDefined),
  ];
  const localFilters = outcomes.map(prop("filter")).filter(isDefined);
  return {
    props: issues.length
      ? props
      : {
          ...props,
          columnBindingVersion: 1,
          vizConfig: vizConfigConversion.config,
          localFilters,
          columnBindings: schema.registry,
          globalFilterTargets: {},
        },
    runtimeConfig: vizConfigConversion.config,
    localFilters,
    issues,
  };
}
