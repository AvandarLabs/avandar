import type { Input } from "./InterpretedCaseDialogue.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: {
    participant: "Demo participant",
    worker: "Demo caseworker",
    interpreter: "Demo interpreter",
  },
  languages: {
    participant: "Demo language A",
    worker: "Demo language B",
  },
  turns: [
    {
      id: "t1",
      speaker: "participant",
      originalText: "I prefer a morning meeting.",
      interpretedText: "I prefer a morning meeting.",
    },
    {
      id: "t2",
      speaker: "worker",
      originalText: "Which morning works for you?",
      interpretedText: "Which morning works for you?",
    },
  ],
  labels: {
    original: "Original speaker",
    interpreted: "Interpretation",
    example: "Fictional language-support example",
  },
  showSightlines: true,
  bubbleLayout: "paired",
};
