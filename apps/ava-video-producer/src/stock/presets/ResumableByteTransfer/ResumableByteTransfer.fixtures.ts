import type { Input } from "./ResumableByteTransfer.schema";
/** Complete fictional default, used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  file: {
    label: "Fictional table file",
    sizeBytes: 1200,
    chunkBytes: 400,
  },
  acknowledgedBytes: 400,
  finalOutcome: "completed",
  labels: {
    confirmed: "Confirmed prefix",
    retry: "Resume here",
    remaining: "Still pending",
    unit: "bytes",
  },
  showOffsets: true,
};
/** Minimum, dense and changed inputs, including semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      file: { ...DEFAULT_INPUT.file, label: "A", sizeBytes: 2, chunkBytes: 1 },
      acknowledgedBytes: 0,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      file: {
        ...DEFAULT_INPUT.file,
        label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        sizeBytes: 100000,
        chunkBytes: 16667,
      },
      acknowledgedBytes: 33334,
      finalOutcome: "still-pending",
      labels: {
        ...DEFAULT_INPUT.labels,
        confirmed: "WWWWWWWWWWWWWWWWWWWWWWWW",
        retry: "WWWWWWWWWWWWWWWWWWWWWWWW",
        remaining: "WWWWWWWWWWWWWWWWWWWWWWWW",
        unit: "WWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      file: {
        ...DEFAULT_INPUT.file,
        label: " Unequal\tfile ",
        sizeBytes: 1100,
      },
      acknowledgedBytes: 0,
      finalOutcome: "still-pending",
      showOffsets: false,
    },
  },
];
/** Structural, reference and arithmetic rejection examples. */
export const invalidInputs: unknown[] = [
  undefined,
  null,
  {},
  {
    ...DEFAULT_INPUT,
    file: { ...DEFAULT_INPUT.file, sizeBytes: 1, chunkBytes: 1 },
  },
  {
    ...DEFAULT_INPUT,
    file: { ...DEFAULT_INPUT.file, sizeBytes: 100001, chunkBytes: 20000 },
  },
  { ...DEFAULT_INPUT, file: { ...DEFAULT_INPUT.file, chunkBytes: 1200 } },
  { ...DEFAULT_INPUT, file: { ...DEFAULT_INPUT.file, chunkBytes: 199 } },
  { ...DEFAULT_INPUT, file: { ...DEFAULT_INPUT.file, chunkBytes: 0 } },
  { ...DEFAULT_INPUT, file: { ...DEFAULT_INPUT.file, chunkBytes: 1201 } },
  {
    ...DEFAULT_INPUT,
    file: { ...DEFAULT_INPUT.file, sizeBytes: 2.5, chunkBytes: 1 },
  },
  { ...DEFAULT_INPUT, acknowledgedBytes: -1 },
  { ...DEFAULT_INPUT, acknowledgedBytes: 1200 },
  { ...DEFAULT_INPUT, acknowledgedBytes: 1 },
  { ...DEFAULT_INPUT, acknowledgedBytes: 400.5 },
  { ...DEFAULT_INPUT, acknowledgedBytes: 800, finalOutcome: "still-pending" },
  { ...DEFAULT_INPUT, file: { ...DEFAULT_INPUT.file, extra: true } },
  { ...DEFAULT_INPUT, finalOutcome: "failed" },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, confirmed: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, confirmed: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, retry: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, retry: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, remaining: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, remaining: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, unit: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, unit: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, extra: true },
];
