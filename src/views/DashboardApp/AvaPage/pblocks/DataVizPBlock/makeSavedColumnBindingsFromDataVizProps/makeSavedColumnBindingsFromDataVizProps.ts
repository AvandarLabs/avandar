import { isDefined, prop } from "@avandar/utils";
import { getQueryColumnIdFromQueryResultColumnName } from "$/models/queries/QueryResultColumnBindings/getQueryColumnIdFromQueryResultColumnName/getQueryColumnIdFromQueryResultColumnName";
import { makeNameBoundVizConfigFromVizConfig } from "$/models/vizs/makeNameBoundVizConfigFromVizConfig/makeNameBoundVizConfigFromVizConfig";
import { makeVizConfigFromNameBoundVizConfig } from "$/models/vizs/makeVizConfigFromNameBoundVizConfig/makeVizConfigFromNameBoundVizConfig";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type {
  QueryResultColumnBindingIssue,
  QueryResultColumnBindings,
} from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type {
  LegacyLocalFilter,
  LocalFilter,
} from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DataVizColumnBindingProps } from "./makeSavedColumnBindingsFromDataVizProps.types";

export type { DataVizColumnBindingProps } from "./makeSavedColumnBindingsFromDataVizProps.types";
type SavedDataVizColumnBindings = {
  props: DataVizColumnBindingProps;
  runtimeConfig: VizConfig.T;
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
 * Binds a chart's saved column references (legacy names or column IDs) to the
 * column IDs of its query's current `QueryResult` columns. A legacy envelope is
 * upgraded only when every name binds to exactly one column.
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
      issues: makeNameBoundVizConfigFromVizConfig({
        config: props.vizConfig,
        columns: schema.columns,
      }).issues,
    };
  }
  const vizConfigConversion = makeVizConfigFromNameBoundVizConfig({
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
