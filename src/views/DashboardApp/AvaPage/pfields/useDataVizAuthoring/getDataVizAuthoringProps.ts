import { makeRuntimeBindingsFromDataVizProps } from "../../pblocks/DataVizPBlock/makeSavedBindingsFromDataVizProps/makeRuntimeBindingsFromDataVizProps";
import { mergeLegacyVizConfigEdit } from "./mergeLegacyVizConfigEdit";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { useResolvedDataVizBindings } from "../../pblocks/DataVizPBlock/useResolvedDataVizBindings/useResolvedDataVizBindings";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
type GetDataVizAuthoringPropsOptions = {
  props: Props;
  bindings: ReturnType<typeof useResolvedDataVizBindings>;
  filters: readonly DashboardFilterRecord[];
  change: DataVizAuthoringChange;
};

/** Explicit edits accepted by current and unresolved legacy field controls. */
export type DataVizAuthoringChange =
  | { kind: "bound"; props: Partial<Extract<Props, { bindingVersion: 1 }>> }
  | { kind: "legacy"; props: Partial<Extract<Props, { bindingVersion: 0 }>> };

/** Returns an atomic field edit without losing unresolved legacy siblings. */
export function getDataVizAuthoringProps(
  options: Readonly<GetDataVizAuthoringPropsOptions>,
): Props | undefined {
  const { props, bindings, filters, change } = options;
  if (
    change.kind === "bound" &&
    bindings.resolved?.props.bindingVersion === 1
  ) {
    return { ...props, ...bindings.resolved.props, ...change.props };
  }
  if (props.bindingVersion !== 0) {
    return undefined;
  }
  const changes =
    change.kind === "legacy"
      ? change.props
      : change.props.vizConfig && bindings.resolved && bindings.schema
        ? {
            vizConfig: mergeLegacyVizConfigEdit({
              legacy: props.vizConfig,
              before: bindings.resolved.runtimeConfig,
              after: change.props.vizConfig,
              columns: bindings.schema.columns,
            }),
          }
        : undefined;
  if (!changes) {
    return undefined;
  }
  const editedProps = { ...props, ...changes };
  const resolvedProps = bindings.schema
    ? makeRuntimeBindingsFromDataVizProps({
        props: editedProps,
        schema: bindings.schema,
        filters: filters,
      }).props
    : editedProps;
  return { ...editedProps, ...resolvedProps };
}
