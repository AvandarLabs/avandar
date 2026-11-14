import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { findNextLayoutToMap } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/mapStepSelection/mapStepSelection";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkAction } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

type LayoutAction = (layoutId: CrosswalkLayout.Id) => Promise<void>;

/** The actions that finish with a layout and move on to the next one. */
type MovingAction = Extract<
  CrosswalkAction,
  { type: "layout_confirmed" | "layout_skipped" }
>;

/** What step 2's footer does. Each action saves the draft it produced. */
export type MapStepActions = {
  /** Skip this dataset, then the next layout to map. */
  skip: LayoutAction;
  /** Map this dataset: returns a skipped layout to the list to map. */
  reopen: LayoutAction;
  /** Accept all suggestions. */
  acceptAll: LayoutAction;
  /** Confirm and next. */
  confirmAndNext: LayoutAction;
};

/**
 * Step 2's footer actions. Each applies its action and saves the draft it
 * produced through `flow.dispatchAndSave`. Skip and Confirm then move on to
 * the next layout after this one that is To do or Review, or to step 3 when
 * none is left. That next layout is read from the draft before the action:
 * both actions change only this layout's status, which the choice skips
 * anyway, and `flow.state` here is the state this render saw, not the one
 * the action produced. A failed save keeps the change and stays put;
 * nothing moves once the user has left the view.
 */
export function useMapStepActions(flow: CrosswalkFlow): MapStepActions {
  const isMountedRef = useIsMounted();
  const saveThenMove = async (action: MovingAction): Promise<void> => {
    const nextLayoutId = findNextLayoutToMap(flow.state.draft, action.layoutId);
    if (!(await flow.dispatchAndSave(action)) || !isMountedRef.current) {
      return;
    }
    if (nextLayoutId) {
      await flow.selectLayout(nextLayoutId);
    } else {
      flow.goToStep("combine");
    }
  };
  return {
    skip: async (layoutId) => {
      await saveThenMove({ type: "layout_skipped", layoutId });
    },
    reopen: async (layoutId) => {
      await flow.dispatchAndSave({ type: "layout_reopened", layoutId });
    },
    acceptAll: async (layoutId) => {
      await flow.dispatchAndSave({ type: "suggestions_accepted", layoutId });
    },
    confirmAndNext: async (layoutId) => {
      await saveThenMove({ type: "layout_confirmed", layoutId });
    },
  };
}
