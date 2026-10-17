import { resolveLegacyColumnName } from "$/models/queries/QueryColumnBindings/resolveLegacyColumnName/resolveLegacyColumnName";
import { bindLegacyVizConfig } from "$/models/vizs/bindLegacyVizConfig/bindLegacyVizConfig";
import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import type {
  BoundResultSchema,
  BindingIssue,
} from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { DataVizBindingProps } from "./resolveSavedDataVizBindings.types";

export type { DataVizBindingProps } from "./resolveSavedDataVizBindings.types";

/** Resolves saved targets in memory, preserving incomplete legacy envelopes. */
export function resolveSavedDataVizBindings(
  props: Readonly<DataVizBindingProps>,
  schema: Readonly<BoundResultSchema>,
): {
  props: DataVizBindingProps;
  runtimeConfig: VizConfig.T;
  issues: readonly BindingIssue[];
} {
  if (props.bindingVersion === 1) {
    return {
      props: { ...props, columnBindings: schema.registry },
      runtimeConfig: props.vizConfig,
      issues: resolveVizColumnBindings(props.vizConfig, schema.columns).issues,
    };
  }
  const bound = bindLegacyVizConfig(props.vizConfig, schema.columns);
  const issues = [...bound.issues];
  const localFilters = props.localFilters.flatMap((filter) => {
    const columnId = resolveLegacyColumnName(filter.columnName, schema.columns);
    if (!columnId) {
      issues.push({
        target: filter.id,
        reason: schema.columns.some((column) => {
          return column.name.toLowerCase() === filter.columnName.toLowerCase();
        })
          ? "ambiguous"
          : "missing",
      });
      return [];
    }
    const { columnName: _columnName, ...definition } = filter;
    return [{ ...definition, columnId }];
  });
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
    issues,
  };
}
