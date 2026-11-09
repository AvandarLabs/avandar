import type { FitState } from "./RegressionModal.types";

/**
 * The fit state `RegressionForm` starts in and returns to when a column
 * changes, so a result never stays on screen for columns it was not fitted on.
 */
export const IDLE_FIT_STATE: FitState = { kind: "idle" };
