import { identity } from "@avandar/utils";
import { createUsePuck } from "@puckeditor/core";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { useResolvedDataVizBindings } from "../../pblocks/DataVizPBlock/useResolvedDataVizBindings/useResolvedDataVizBindings";
import { getDataVizAuthoringProps } from "./getDataVizAuthoringProps";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizAuthoringChange } from "./getDataVizAuthoringProps";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

const usePuckSelector = createUsePuck();

type Authoring = ReturnType<typeof useResolvedDataVizBindings> & {
  props: Props & { id: string };
  update: (changes: Partial<Extract<Props, { bindingVersion: 1 }>>) => void;
  updateLegacy: (
    changes: Partial<Extract<Props, { bindingVersion: 0 }>>,
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

/** Commits owning-block bindings only on explicit field edits. */
export function useDataVizAuthoring(
  auth: Readonly<StructuredQueryAuth>,
): Authoring {
  const { props, replace } = useSelectedDataVizOwner();
  const { filtersById } = DashboardFilterStateManager.useState();
  const bindings = useResolvedDataVizBindings({ props: props, auth: auth });
  const update = (change: DataVizAuthoringChange): void => {
    const updated = getDataVizAuthoringProps({
      props,
      bindings,
      filters: Object.values(filtersById),
      change,
    });
    if (updated) {
      replace(updated);
    }
  };
  return {
    ...bindings,
    props,
    update: (changes) => {
      return update({ kind: "bound", props: changes });
    },
    updateLegacy: (changes) => {
      return update({ kind: "legacy", props: changes });
    },
  };
}
