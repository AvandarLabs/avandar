import { identity } from "@avandar/utils";
import { createUsePuck } from "@puckeditor/core";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { useDataVizRuntimeColumnBindings } from "../../pblocks/DataVizPBlock/useDataVizRuntimeColumnBindings/useDataVizRuntimeColumnBindings";
import { getDataVizAuthoringProps } from "./getDataVizAuthoringProps";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizAuthoringChange } from "./getDataVizAuthoringProps";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

const usePuckSelector = createUsePuck();

type Authoring = ReturnType<typeof useDataVizRuntimeColumnBindings> & {
  props: Props & { id: string };
  update: (
    changes: Partial<Extract<Props, { columnBindingVersion: 1 }>>,
  ) => void;
  updateColumnNameProps: (
    changes: Partial<Extract<Props, { columnBindingVersion: 0 }>>,
  ) => void;
};

function useSelectedDataVizOwner(): {
  props: Props & { id: string };
  replace: (updatedProps: Props) => void;
} {
  const editor = usePuckSelector(identity);
  const selected = editor.selectedItem;
  const props = selected?.props as Props & { id: string };
  const replace = (updatedProps: Props): void => {
    if (!selected) {
      return;
    }
    const selector = editor.getSelectorForId(props.id);
    if (!selector) {
      return;
    }
    editor.dispatch({
      type: "replace",
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...selected, props: { ...updatedProps, id: props.id } },
    });
  };
  return { props, replace };
}

/**
 * Gives a Puck field the selected DataViz block's props and column bindings,
 * and functions that write a field edit back to that block. The block is
 * rewritten only on a field edit, never on render. Use it in a field that
 * edits a chart, for example its viz settings or its local filters.
 */
export function useDataVizAuthoring(
  auth: Readonly<StructuredQueryAuth>,
): Authoring {
  const { props, replace } = useSelectedDataVizOwner();
  const { filtersById } = DashboardFilterStateManager.useState();
  const columnBindings = useDataVizRuntimeColumnBindings({
    props: props,
    auth: auth,
  });
  const update = (change: DataVizAuthoringChange): void => {
    const updated = getDataVizAuthoringProps({
      props,
      columnBindings,
      filters: Object.values(filtersById),
      change,
    });
    if (updated) {
      replace(updated);
    }
  };
  return {
    ...columnBindings,
    props,
    update: (changes) => {
      return update({ kind: "columnId", props: changes });
    },
    updateColumnNameProps: (changes) => {
      return update({ kind: "columnName", props: changes });
    },
  };
}
