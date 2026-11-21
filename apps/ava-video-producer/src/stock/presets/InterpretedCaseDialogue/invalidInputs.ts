import { omit } from "@avandar/utils";
import { DEFAULT_INPUT } from "./defaultInput";
/** Rejected structural, boundary and cross-field inputs. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  omit(DEFAULT_INPUT, "people"),
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, extra: true } },
  omit(DEFAULT_INPUT, "languages"),
  { ...DEFAULT_INPUT, languages: { ...DEFAULT_INPUT.languages, extra: true } },
  omit(DEFAULT_INPUT, "turns"),
  {
    ...DEFAULT_INPUT,
    turns: [
      {
        id: "t1",
        speaker: "participant",
        originalText: "I prefer a morning meeting.",
        interpretedText: "I prefer a morning meeting.",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      {
        id: "t1",
        speaker: "participant",
        originalText: "I prefer a morning meeting.",
        interpretedText: "I prefer a morning meeting.",
      },
      {
        id: "t1",
        speaker: "participant",
        originalText: "I prefer a morning meeting.",
        interpretedText: "I prefer a morning meeting.",
      },
      {
        id: "t1",
        speaker: "participant",
        originalText: "I prefer a morning meeting.",
        interpretedText: "I prefer a morning meeting.",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [{ ...DEFAULT_INPUT.turns[0], extra: true }, DEFAULT_INPUT.turns[1]],
  },
  omit(DEFAULT_INPUT, "labels"),
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  omit(DEFAULT_INPUT, "showSightlines"),
  omit(DEFAULT_INPUT, "bubbleLayout"),
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      participant: "WWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    people: { ...DEFAULT_INPUT.people, worker: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      interpreter: "WWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    languages: {
      ...DEFAULT_INPUT.languages,
      participant: "WWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    languages: {
      ...DEFAULT_INPUT.languages,
      worker: "WWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      { ...DEFAULT_INPUT.turns[0], id: "WWWWWWWWWWWWWWWWW" },
      DEFAULT_INPUT.turns[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      { ...DEFAULT_INPUT.turns[0], speaker: "invalid" },
      DEFAULT_INPUT.turns[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      {
        ...DEFAULT_INPUT.turns[0],
        originalText: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.turns[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      {
        ...DEFAULT_INPUT.turns[0],
        interpretedText: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.turns[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      original: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      interpreted: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, bubbleLayout: "invalid" },
  {
    ...DEFAULT_INPUT,
    turns: [DEFAULT_INPUT.turns[0], { ...DEFAULT_INPUT.turns[1], id: "t1" }],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      { ...DEFAULT_INPUT.turns[0], speaker: "worker" },
      DEFAULT_INPUT.turns[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    turns: [
      DEFAULT_INPUT.turns[0],
      { ...DEFAULT_INPUT.turns[1], speaker: "participant" },
    ],
  },
];
