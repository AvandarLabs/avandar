import type { Input } from "./SchoolTransitionRehearsal.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: {
    learner: "Demo learner",
    companion: "Chosen companion",
  },
  stops: [
    {
      id: "locker",
      kind: "locker",
      label: "Demo locker",
      actionLabel: "Try the locker",
    },
    {
      id: "room",
      kind: "classroom",
      label: "Demo classroom",
      actionLabel: "Find the room",
    },
  ],
  finalStepSupport: "stands-back",
  showPracticeStrip: true,
  labels: {
    setting: "Demo school interior",
    practice: "Practice visit",
    choice: "Try this step myself",
    example: "Fictional transition example",
  },
  showFootprints: false,
};
