import { makeRuntimeColumnBindingsFromDataVizProps } from "../../pblocks/DataVizPBlock/makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import { mergeUiVizConfigEdit } from "./mergeUiVizConfigEdit";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { useDataVizRuntimeColumnBindings } from "../../pblocks/DataVizPBlock/useDataVizRuntimeColumnBindings/useDataVizRuntimeColumnBindings";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

type GetDataVizAuthoringPropsOptions = {
  props: Props;
  columnBindings: ReturnType<typeof useDataVizRuntimeColumnBindings>;
  filters: readonly DashboardFilterRecord[];
  change: DataVizAuthoringChange;
};

/**
 * Explicit edits accepted by current and unresolved name-bound field
 * controls.
 */
export type DataVizAuthoringChange =
  | {
      kind: "columnId";
      props: Partial<Extract<Props, { columnBindingVersion: 1 }>>;
    }
  | {
      kind: "columnName";
      props: Partial<Extract<Props, { columnBindingVersion: 0 }>>;
    };

/**
 * Applies one field edit to a DataViz block's props and binds the result to
 * its query's column IDs. On a version 0 chart, settings whose column names
 * do not bind stay as saved. Undefined when the edit cannot apply yet, such
 * as before the chart's columns are known. Called only by
 * `useDataVizAuthoring` for each field edit.
 */
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
    change.kind === "columnName"
      ? change.props
      : change.props.vizConfig &&
          columnBindings.runtime &&
          columnBindings.schema
        ? {
            vizConfig: mergeUiVizConfigEdit({
              uiVizConfig: props.vizConfig,
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
