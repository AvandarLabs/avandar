import type { Input } from "./AtomicOutboxCommit.schema";
/** Complete fictional default, used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  change: {
    id: "edit-a",
    recordLabel: "Fictional stock note",
    before: "Count 2",
    after: "Count 3",
  },
  outcome: "commit",
  labels: {
    local: "Local record",
    outbox: "Delivery journal",
    pending: "Provisional",
    committed: "Both committed",
    aborted: "Neither committed",
  },
  showIdentifier: true,
  copy: {
    context: "Fictional example",
    before: "Before",
    after: "After",
  },
};
/** Minimum, dense and changed inputs, including semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      change: {
        ...DEFAULT_INPUT.change,
        id: "a",
        recordLabel: "",
        before: "",
        after: " ",
      },
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      change: {
        ...DEFAULT_INPUT.change,
        id: "WWWWWWWWWWWWWWWW",
        recordLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWW",
        after: "MMMMMMMMMMMMMMMMMMMMMMMM",
      },
      labels: {
        ...DEFAULT_INPUT.labels,
        local: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        outbox: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        pending: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        committed: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        aborted: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      copy: {
        ...DEFAULT_INPUT.copy,
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      change: {
        ...DEFAULT_INPUT.change,
        id: "edit-b",
        recordLabel: " Changed\t record ",
        before: "  ",
        after: "\n",
      },
      outcome: "abort",
      showIdentifier: false,
    },
  },
];
/** Structural, reference and arithmetic rejection examples. */
export const invalidInputs: unknown[] = [
  undefined,
  null,
  {},
  { ...DEFAULT_INPUT, change: { ...DEFAULT_INPUT.change, id: "" } },
  {
    ...DEFAULT_INPUT,
    change: { ...DEFAULT_INPUT.change, id: "xxxxxxxxxxxxxxxxx" },
  },
  {
    ...DEFAULT_INPUT,
    change: {
      ...DEFAULT_INPUT.change,
      recordLabel: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
  },
  {
    ...DEFAULT_INPUT,
    change: { ...DEFAULT_INPUT.change, before: "xxxxxxxxxxxxxxxxxxxxxxxxx" },
  },
  {
    ...DEFAULT_INPUT,
    change: { ...DEFAULT_INPUT.change, after: "xxxxxxxxxxxxxxxxxxxxxxxxx" },
  },
  { ...DEFAULT_INPUT, change: { ...DEFAULT_INPUT.change, after: "Count 2" } },
  { ...DEFAULT_INPUT, change: { ...DEFAULT_INPUT.change, extra: true } },
  { ...DEFAULT_INPUT, outcome: "local-only" },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, local: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, local: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, outbox: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, outbox: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, pending: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, pending: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, committed: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      committed: "WWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, aborted: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, aborted: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, context: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, before: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, after: "" } },
  {
    ...DEFAULT_INPUT,
    copy: {
      ...DEFAULT_INPUT.copy,
      after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
  { ...DEFAULT_INPUT, extra: true },
];
