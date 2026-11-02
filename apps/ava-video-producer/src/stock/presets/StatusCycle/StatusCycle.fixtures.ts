import type { StatusCycleInput } from "./StatusCycle.schema";

/** Complete fictional example used only when input is omitted. */
export const STATUS_CYCLE_DEFAULT_INPUT: StatusCycleInput = {
  states: [
    { label: "Queued", detail: "Ready to begin", at: 12 },
    { label: "Processing", detail: "Moving through the stages", at: 55 },
    { label: "Complete", detail: "The example is ready", at: 113 },
  ],
  showProgress: true,
};

/** The maximum supported collection density in the authored layout. */
export const statusCycleDenseInput: StatusCycleInput = {
  ...STATUS_CYCLE_DEFAULT_INPUT,
  states: [
    { label: "Queued", detail: "Ready to begin", at: 12 },
    { label: "Processing", detail: "Authored middle state", at: 70 },
    { label: "Complete", detail: "Authored final state", at: 135 },
  ],
};

/** A complete smaller or differently selected authored example. */
export const statusCycleChangedInput: StatusCycleInput = {
  ...STATUS_CYCLE_DEFAULT_INPUT,
  states: [
    { label: "Waiting", detail: "Authored initial state", at: 12 },
    { label: "Approved", detail: "Authored final state", at: 100 },
  ],
  showProgress: false,
};

/** Named examples available to editors and semantic regression checks. */
export const statusCycleFixtures: Array<{
  id: string;
  input: {
    states: Array<{ label: string; detail: string; at: number }>;
    showProgress: boolean;
  };
}> = [
  { id: "default", input: STATUS_CYCLE_DEFAULT_INPUT },
  { id: "dense", input: statusCycleDenseInput },
  { id: "changed", input: statusCycleChangedInput },
];
