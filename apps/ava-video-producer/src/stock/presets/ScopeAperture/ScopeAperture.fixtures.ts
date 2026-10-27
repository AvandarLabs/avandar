import type { Input } from "./ScopeAperture.schema";
/** Complete fictional content, used only for an omitted entire input. */
export const DEFAULT_INPUT: Input = {
  broadTopic: "Planning a fictional studio",
  topics: [
    {
      id: "light",
      label: "Lighting",
      included: false,
    },
    {
      id: "shelves",
      label: "Storage shelves",
      included: true,
    },
    {
      id: "bins",
      label: "Supply bins",
      included: true,
    },
    {
      id: "seating",
      label: "Seating",
      included: false,
    },
  ],
  focusedQuestion: "Where will supplies be stored?",
  outsideLabel: "Other topics come later",
  insideLabel: "This explanation",
  showExcludedTopics: true,
};
/** Reproducible accepted collection and text-boundary variants. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      broadTopic: "B",
      topics: [
        {
          id: "a",
          label: "A",
          included: true,
        },
        {
          id: "b",
          label: "B",
          included: false,
        },
        {
          id: "c",
          label: "C",
          included: false,
        },
      ],
      focusedQuestion: "Q",
      outsideLabel: "O",
      insideLabel: "I",
      showExcludedTopics: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      broadTopic:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      topics: [
        {
          id: "item-0",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: true,
        },
        {
          id: "item-1",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: true,
        },
        {
          id: "item-2",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: true,
        },
        {
          id: "item-3",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: false,
        },
        {
          id: "item-4",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: false,
        },
        {
          id: "item-5",
          label: "界界界界界界界界界界界界界界界界界界界界界界",
          included: false,
        },
      ],
      focusedQuestion:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      outsideLabel:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      insideLabel: "界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      topics: [
        {
          id: "light",
          label: "Lighting",
          included: true,
        },
        {
          id: "shelves",
          label: "Storage shelves",
          included: false,
        },
        {
          id: "bins",
          label: "Supply bins",
          included: true,
        },
        {
          id: "seating",
          label: "Seating",
          included: false,
        },
      ],
      focusedQuestion: "Where should the light fall?",
      showExcludedTopics: false,
    },
  },
];
