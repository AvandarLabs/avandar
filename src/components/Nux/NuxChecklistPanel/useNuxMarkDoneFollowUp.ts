import { useEffect, useRef, useState } from "react";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";

/**
 * How long the filled check stays visible before the tour closes or the
 * finished panel hides.
 */
export const MARK_DONE_FOLLOW_UP_MS = 400;

type MarkDoneFollowUp = {
  isHoldingCompletion: boolean;
  markDone: (key: NuxProgress.MilestoneKey) => void;
  unmarkDone: (key: NuxProgress.MilestoneKey) => void;
};

type ScheduleMarkDoneOptions = {
  key: NuxProgress.MilestoneKey;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  dispatch: ReturnType<typeof NuxStateManager.useDispatch>;
  latestStateRef: RefObject<NuxAppState>;
  pendingKeyRef: MutableRefObject<NuxProgress.MilestoneKey | undefined>;
  setIsHoldingCompletion: Dispatch<SetStateAction<boolean>>;
  timerRef: MutableRefObject<number | undefined>;
};

function _clearFollowUpTimer(
  timerRef: MutableRefObject<number | undefined>,
): void {
  if (timerRef.current === undefined) {
    return;
  }
  window.clearTimeout(timerRef.current);
  timerRef.current = undefined;
}

function _scheduleMarkDone(options: ScheduleMarkDoneOptions): void {
  if (
    nuxSelectors.areAllMilestonesComplete([
      ...options.completedMilestones,
      options.key,
    ])
  ) {
    options.setIsHoldingCompletion(true);
  }
  options.dispatch.markMilestoneDone(options.key);
  _clearFollowUpTimer(options.timerRef);
  options.pendingKeyRef.current = options.key;
  options.timerRef.current = window.setTimeout(() => {
    options.timerRef.current = undefined;
    options.pendingKeyRef.current = undefined;
    if (options.latestStateRef.current?.activeMilestoneKey === options.key) {
      options.dispatch.clearActiveMilestone();
    }
    options.setIsHoldingCompletion(false);
  }, MARK_DONE_FOLLOW_UP_MS);
}

/**
 * Completes a checklist mark immediately, then waits 400ms before closing
 * that milestone's tour or hiding a finished panel.
 */
export function useNuxMarkDoneFollowUp(): MarkDoneFollowUp {
  const [state, dispatch] = NuxStateManager.useContext();
  const [isHoldingCompletion, setIsHoldingCompletion] = useState(false);
  const latestStateRef = useRef(state);
  const pendingKeyRef = useRef<NuxProgress.MilestoneKey | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(
    function trackLatestNuxState() {
      latestStateRef.current = state;
    },
    [state],
  );

  useEffect(function clearMarkDoneFollowUpOnUnmount() {
    return () => {
      _clearFollowUpTimer(timerRef);
    };
  }, []);

  return {
    isHoldingCompletion,
    markDone: (key) => {
      _scheduleMarkDone({
        key,
        completedMilestones: state.completedMilestones,
        dispatch,
        latestStateRef,
        pendingKeyRef,
        setIsHoldingCompletion,
        timerRef,
      });
    },
    unmarkDone: (key) => {
      dispatch.unmarkMilestoneDone(key);
      if (pendingKeyRef.current !== key) {
        return;
      }
      _clearFollowUpTimer(timerRef);
      pendingKeyRef.current = undefined;
      setIsHoldingCompletion(false);
    },
  };
}
