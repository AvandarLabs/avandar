import { makeRuntimeColumnBindingsFromDataVizProps } from "../../pblocks/DataVizPBlock/makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import { mergeLegacyVizConfigEdit } from "./mergeLegacyVizConfigEdit";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { useDataVizRuntimeColumnBindings } from "../../pblocks/DataVizPBlock/useDataVizRuntimeColumnBindings/useDataVizRuntimeColumnBindings";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
type GetDataVizAuthoringPropsOptions = {
  props: Props;
  columnBindings: ReturnType<typeof useDataVizRuntimeColumnBindings>;
  filters: readonly DashboardFilterRecord[];
  change: DataVizAuthoringChange;
};

/** Explicit edits accepted by current and unresolved legacy field controls. */
export type DataVizAuthoringChange =
  | {
      kind: "columnId";
      props: Partial<Extract<Props, { columnBindingVersion: 1 }>>;
    }
  | {
      kind: "legacy";
      props: Partial<Extract<Props, { columnBindingVersion: 0 }>>;
    };

/** Returns an atomic field edit without losing unresolved legacy siblings. */
export function getDataVizAuthoringProps(
  options: Readonly<GetDataVizAuthoringPropsOptions>,
): Props | undefined {
  const { props, columnBindings, filters, change } = options;
  if (
    change.kind === "columnId" &&
    columnBindings.runtime?.props.columnBindingVersion === 1
  ) {
    return { ...props, ...columnBindings.runtime.props, ...change.props };
  }
  if (props.columnBindingVersion !== 0) {
    return undefined;
  }
  const changes =
    change.kind === "legacy"
      ? change.props
      : change.props.vizConfig &&
          columnBindings.runtime &&
          columnBindings.schema
        ? {
            vizConfig: mergeLegacyVizConfigEdit({
              legacy: props.vizConfig,
              before: columnBindings.runtime.runtimeConfig,
              after: change.props.vizConfig,
              columns: columnBindings.schema.columns,
            }),
          }
        : undefined;
  if (!changes) {
    return undefined;
  }
  const editedProps = { ...props, ...changes };
  const resolvedProps = columnBindings.schema
    ? makeRuntimeColumnBindingsFromDataVizProps({
        props: editedProps,
        schema: columnBindings.schema,
        filters: filters,
      }).props
    : editedProps;
  return { ...editedProps, ...resolvedProps };
}
