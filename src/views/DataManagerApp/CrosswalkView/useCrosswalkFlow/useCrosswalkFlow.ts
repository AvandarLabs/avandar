import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  crosswalkReducer,
  isCrosswalkDirty,
  makeInitialCrosswalkState,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import { useSaveCrosswalk } from "@/views/DataManagerApp/CrosswalkView/useSaveCrosswalk/useSaveCrosswalk";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  CrosswalkAction,
  CrosswalkState,
  CrosswalkStep,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { RefObject } from "react";

const STEPS: readonly CrosswalkStep[] = ["datasets", "map", "combine"];

/** Everything a crosswalk step reads and does. */
export type CrosswalkFlow = {
  state: CrosswalkState;
  /** Applies an action now; later reads of the flow see its result. */
  dispatch: (action: CrosswalkAction) => void;
  step: CrosswalkStep;
  /**
   * The layout in the URL, if any; Map each dataset picks one when it is
   * missing.
   */
  layoutId: CrosswalkLayout.Id | undefined;
  reachableSteps: ReadonlySet<CrosswalkStep>;
  /**
   * Opens a step on the crosswalk's own URL. Does nothing before the first
   * save.
   */
  goToStep: (step: CrosswalkStep, layoutId?: CrosswalkLayout.Id) => void;
  /**
   * Saves unsaved changes, then opens a layout in Map each dataset. The
   * layout opens even when the save fails; the changes stay unsaved.
   */
  selectLayout: (layoutId: CrosswalkLayout.Id) => Promise<void>;
  save: (draft: CrosswalkDraft.T) => Promise<boolean>;
  /** Applies an action, then saves the draft it produced. */
  dispatchAndSave: (action: CrosswalkAction) => Promise<boolean>;
  isSaving: boolean;
};

/**
 * The steps the crosswalk can open now. Map each dataset needs saved
 * columns; Create combined dataset also needs a layout with a dataset.
 */
export function getReachableSteps(
  state: CrosswalkState,
): ReadonlySet<CrosswalkStep> {
  const hasSavedColumns = (state.savedDraft?.columns.length ?? 0) > 0;
  const hasDataset = state.draft.layouts.some((layout) => {
    return layout.datasetIds.length > 0;
  });
  return new Set<CrosswalkStep>([
    "datasets",
    ...(hasSavedColumns ? (["map"] as const) : []),
    ...(hasSavedColumns && hasDataset ? (["combine"] as const) : []),
  ]);
}

/** The step and layout the URL names, ignoring anything else in it. */
function useFlowSearch(): {
  searchStep: CrosswalkStep | undefined;
  layoutId: CrosswalkLayout.Id | undefined;
} {
  // Not strict: the view also renders on `/crosswalks/new`, which has no
  // search.
  const search = useSearch({ strict: false }) as {
    step?: unknown;
    layoutId?: unknown;
  };
  return {
    searchStep: STEPS.find((step) => {
      return step === search.step;
    }),
    layoutId:
      typeof search.layoutId === "string"
        ? (search.layoutId as CrosswalkLayout.Id)
        : undefined,
  };
}

/**
 * The view's state, updated once per action. The reducer mints ids, so it
 * runs here rather than in `useReducer`, which may call it twice; the ref
 * lets async callers read the state after the last action.
 */
function useCrosswalkState(
  initialDraft: CrosswalkDraft.T,
  isSaved: boolean,
): {
  state: CrosswalkState;
  stateRef: RefObject<CrosswalkState>;
  dispatch: (action: CrosswalkAction) => void;
} {
  const [state, setState] = useState(() => {
    return makeInitialCrosswalkState(initialDraft, { isSaved });
  });
  const stateRef = useRef(state);
  const dispatch = useCallback((action: CrosswalkAction) => {
    const nextState = crosswalkReducer(stateRef.current, action);
    stateRef.current = nextState;
    setState(nextState);
  }, []);
  return { state, stateRef, dispatch };
}

/**
 * Opens a step on the crosswalk's own URL. Does nothing before the first
 * save.
 */
function useGoToStep(
  options: Readonly<{
    crosswalkId: Crosswalk.Id;
    stateRef: RefObject<CrosswalkState>;
  }>,
): CrosswalkFlow["goToStep"] {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  return (step, layoutId) => {
    const { draft } = options.stateRef.current;
    if (!draft.isSaved) {
      return;
    }
    const link = AppLinks.dataManagerCrosswalkView({
      workspaceSlug: workspace.slug,
      crosswalkId: options.crosswalkId,
      crosswalkName: draft.name,
      step,
      layoutId,
    });
    navigate({ to: link.to, params: link.params, search: link.search });
  };
}

/**
 * The crosswalk view's state and navigation: the reducer, the step and
 * layout in the URL (falling back to Choose datasets for a step the
 * crosswalk cannot open yet), and saving. Every action that saves goes
 * through `dispatchAndSave`, so the save always sends the draft after it.
 */
export function useCrosswalkFlow(
  options: Readonly<{
    crosswalkId: Crosswalk.Id;
    initialDraft: CrosswalkDraft.T;
    isSaved: boolean;
  }>,
): CrosswalkFlow {
  const { state, stateRef, dispatch } = useCrosswalkState(
    options.initialDraft,
    options.isSaved,
  );
  const [save, isSaving] = useSaveCrosswalk(dispatch);
  const { searchStep, layoutId } = useFlowSearch();
  const goToStep = useGoToStep({ crosswalkId: options.crosswalkId, stateRef });
  const reachableSteps = getReachableSteps(state);
  const dispatchAndSave = (action: CrosswalkAction): Promise<boolean> => {
    dispatch(action);
    return save(stateRef.current.draft);
  };
  const selectLayout = async (
    nextLayoutId: CrosswalkLayout.Id,
  ): Promise<void> => {
    // A failed save (offline, refused) has already said why; the changes stay
    // in the draft and the next action saves them, so the layout still opens.
    if (isCrosswalkDirty(stateRef.current)) {
      await save(stateRef.current.draft);
    }
    goToStep("map", nextLayoutId);
  };
  const step =
    searchStep && reachableSteps.has(searchStep) ? searchStep : "datasets";
  return {
    state,
    dispatch,
    step,
    layoutId,
    reachableSteps,
    goToStep,
    selectLayout,
    save,
    dispatchAndSave,
    isSaving,
  };
}
