import { isDefined, prop } from "@avandar/utils";
import { getColumnIdFromLegacyName } from "$/models/queries/QueryColumnBindings/getColumnIdFromLegacyName/getColumnIdFromLegacyName";
import { makeBoundVizConfigFromLegacyConfig } from "$/models/vizs/makeBoundVizConfigFromLegacyConfig/makeBoundVizConfigFromLegacyConfig";
import { makeResolvedVizConfigFromBoundConfig } from "$/models/vizs/makeResolvedVizConfigFromBoundConfig/makeResolvedVizConfigFromBoundConfig";
import type {
  BindingIssue,
  BoundResultSchema,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type {
  LegacyLocalFilter,
  LocalFilter,
} from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DataVizBindingProps } from "./makeSavedBindingsFromDataVizProps.types";

export type { DataVizBindingProps } from "./makeSavedBindingsFromDataVizProps.types";
type SavedDataVizBindings = {
  props: DataVizBindingProps;
  runtimeConfig: VizConfig.T;
  issues: BindingIssue[];
  localFilters: readonly LocalFilter[];
};

function _getLocalFilterOutcome({
  filter,
  columns,
}: {
  filter: LegacyLocalFilter;
  columns: readonly QueryResult.BoundColumn[];
}): { filter: LocalFilter | undefined; issue: BindingIssue | undefined } {
  const columnId = getColumnIdFromLegacyName({
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

/** Resolves saved targets in memory, preserving incomplete legacy envelopes. */
export function makeSavedBindingsFromDataVizProps({
  props,
  schema,
}: Readonly<{
  props: Readonly<DataVizBindingProps>;
  schema: Readonly<BoundResultSchema>;
}>): SavedDataVizBindings {
  if (props.bindingVersion === 1) {
    return {
      props: { ...props, columnBindings: schema.registry },
      runtimeConfig: props.vizConfig,
      localFilters: props.localFilters,
      issues: makeResolvedVizConfigFromBoundConfig({
        config: props.vizConfig,
        columns: schema.columns,
      }).issues,
    };
  }
  const bound = makeBoundVizConfigFromLegacyConfig({
    config: props.vizConfig,
    columns: schema.columns,
  });
  const outcomes = props.localFilters.map((filter) => {
    return _getLocalFilterOutcome({ filter, columns: schema.columns });
  });
  const issues = [
    ...bound.issues,
    ...outcomes.map(prop("issue")).filter(isDefined),
  ];
  const localFilters = outcomes.map(prop("filter")).filter(isDefined);
  return {
    props: issues.length
      ? props
      : {
          ...props,
          bindingVersion: 1,
          vizConfig: bound.config,
          localFilters,
          columnBindings: schema.registry,
          globalFilterTargets: {},
        },
    runtimeConfig: bound.config,
    localFilters,
    issues,
  };
}
