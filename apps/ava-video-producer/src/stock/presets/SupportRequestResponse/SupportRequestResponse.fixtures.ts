import type { Input } from "./SupportRequestResponse.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  people: { requester: "Sam", colleague: "Lee" },
  task: { label: "Review the draft", kind: "document" },
  requestText: "Can we check this together?",
  response: { state: "joins", text: "Yes, let us look together." },
  labels: {
    ownedBy: "Task owner",
    open: "Work remains open",
    shared: "Working together",
    example: "Fictional support exchange",
  },
  showRequestAtHold: true,
};
/**
 * Minimum, maximum-density and changed semantics exercise authored variants.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: { requester: "A", colleague: "B" },
      task: { label: "A", kind: "assembly" },
      requestText: "C",
      response: { state: "declines", text: "N" },
      labels: { ownedBy: "T", open: "W", shared: "W", example: "F" },
      showRequestAtHold: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      people: {
        requester: "WWWWWWWWWWWWWWWWWW",
        colleague: "VVVVVVVVVVVVVVVVVV",
      },
      task: { ...DEFAULT_INPUT.task, label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW" },
      requestText: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      response: {
        ...DEFAULT_INPUT.response,
        text: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      labels: {
        ownedBy: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        open: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        shared: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      task: { ...DEFAULT_INPUT.task, kind: "assembly" },
      response: { state: "later", text: "I can check it after lunch." },
      showRequestAtHold: false,
    },
  },
];
/** Rejection documents preserve all unaffected input fields. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, people: { requester: "A", colleague: "A" } },
  { ...DEFAULT_INPUT, response: { state: "done", text: "Done" } },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, label: "" } },
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, extra: true } },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, requester: "" } },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      requester:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, colleague: "" } },
  {
    ...DEFAULT_INPUT,
    people: {
      ...DEFAULT_INPUT.people,
      colleague:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, extra: true } },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, label: "" } },
  {
    ...DEFAULT_INPUT,
    task: {
      ...DEFAULT_INPUT.task,
      label:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, kind: "INVALID" } },
  { ...DEFAULT_INPUT, requestText: "" },
  {
    ...DEFAULT_INPUT,
    requestText:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, response: { ...DEFAULT_INPUT.response, extra: true } },
  {
    ...DEFAULT_INPUT,
    response: { ...DEFAULT_INPUT.response, state: "INVALID" },
  },
  { ...DEFAULT_INPUT, response: { ...DEFAULT_INPUT.response, text: "" } },
  {
    ...DEFAULT_INPUT,
    response: {
      ...DEFAULT_INPUT.response,
      text: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, ownedBy: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      ownedBy:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, open: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      open: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, shared: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      shared:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, showRequestAtHold: "true" },
];
