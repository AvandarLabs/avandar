import type { Input } from "./PortableWorkTransfer.schema";
/** Complete fictional default, used only for omitted input. */
export const DEFAULT_INPUT: Input = {
  ownerLabel: "Project owner",
  tools: { source: "Tool A", destination: "Tool B" },
  artifacts: [
    { id: "a", label: "Project notes", kind: "note" },
    { id: "b", label: "Activity sheet", kind: "sheet" },
  ],
  transferState: "accepted",
  labels: {
    originals: "Retained originals",
    copies: "Same-ID copies",
    portable: "Portable work",
    received: "Opened at destination",
    pending: "Awaiting opening",
    example: "Fictional portability principle",
  },
  showIdentityTabs: true,
};
/** Default, minimum, dense and changed semantic documents. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      ownerLabel: "Project owner",
      tools: { source: "Tool A", destination: "Tool B" },
      artifacts: [
        { id: "a", label: "Project notes", kind: "note" },
        { id: "b", label: "Activity sheet", kind: "sheet" },
      ],
      transferState: "accepted",
      labels: {
        originals: "Retained originals",
        copies: "Same-ID copies",
        portable: "Portable work",
        received: "Opened at destination",
        pending: "Awaiting opening",
        example: "Fictional portability principle",
      },
      showIdentityTabs: true,
    },
  },
  {
    id: "minimum",
    input: {
      ownerLabel: "Project owner",
      tools: { source: "Tool A", destination: "Tool B" },
      artifacts: [{ id: "a", label: "A", kind: "chart" }],
      transferState: "awaiting-open",
      labels: {
        originals: "Retained originals",
        copies: "Same-ID copies",
        portable: "Portable work",
        received: "Opened at destination",
        pending: "Awaiting opening",
        example: "Fictional portability principle",
      },
      showIdentityTabs: false,
    },
  },
  {
    id: "dense",
    input: {
      ownerLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      tools: {
        source: "WWWWWWWWWWWWWWWWWWWWWWWW",
        destination: "VVVVVVVVVVVVVVVVVVVVVVVV",
      },
      artifacts: [
        {
          id: "aaaaaaaaaaaaaaaaaaaa",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          kind: "note",
        },
        {
          id: "bbbbbbbbbbbbbbbbbbbb",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          kind: "sheet",
        },
        {
          id: "cccccccccccccccccccc",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          kind: "chart",
        },
        {
          id: "dddddddddddddddddddd",
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          kind: "note",
        },
      ],
      transferState: "accepted",
      labels: {
        originals: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        copies: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        portable: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        received: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        pending: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showIdentityTabs: true,
    },
  },
  {
    id: "changed",
    input: {
      ownerLabel: "Project owner",
      tools: { source: "Tool A", destination: "Tool B" },
      artifacts: [
        { id: "a", label: "Project notes", kind: "note" },
        { id: "b", label: "Activity sheet", kind: "sheet" },
        { id: "c", label: "Outline", kind: "chart" },
      ],
      transferState: "awaiting-open",
      labels: {
        originals: "Retained originals",
        copies: "Same-ID copies",
        portable: "Portable work",
        received: "Opened at destination",
        pending: "Awaiting opening",
        example: "Fictional portability principle",
      },
      showIdentityTabs: false,
    },
  },
];
/** Invalid structures, bounds, and cross references. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, artifacts: [] },
  { ...DEFAULT_INPUT, artifacts: Array(5).fill(DEFAULT_INPUT.artifacts[0]) },
  {
    ...DEFAULT_INPUT,
    artifacts: [DEFAULT_INPUT.artifacts[0], DEFAULT_INPUT.artifacts[0]],
  },
  { ...DEFAULT_INPUT, tools: { source: "A", destination: "A" } },
  { ...DEFAULT_INPUT, transferState: "done" },
  { ...DEFAULT_INPUT, showIdentityTabs: 1 },
  { ...DEFAULT_INPUT, ownerLabel: "" },
  { ...DEFAULT_INPUT, ownerLabel: "W".repeat(25) },
  { ...DEFAULT_INPUT, tools: { ...DEFAULT_INPUT.tools, source: "" } },
  {
    ...DEFAULT_INPUT,
    tools: { ...DEFAULT_INPUT.tools, source: "W".repeat(25) },
  },
  { ...DEFAULT_INPUT, tools: { ...DEFAULT_INPUT.tools, destination: "" } },
  {
    ...DEFAULT_INPUT,
    tools: { ...DEFAULT_INPUT.tools, destination: "W".repeat(25) },
  },
  {
    ...DEFAULT_INPUT,
    artifacts: DEFAULT_INPUT.artifacts.map((item, index) =>
      index === 0 ? { ...item, id: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    artifacts: DEFAULT_INPUT.artifacts.map((item, index) =>
      index === 0 ? { ...item, id: "W".repeat(21) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    artifacts: DEFAULT_INPUT.artifacts.map((item, index) =>
      index === 0 ? { ...item, label: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    artifacts: DEFAULT_INPUT.artifacts.map((item, index) =>
      index === 0 ? { ...item, label: "W".repeat(25) } : item,
    ),
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, originals: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, originals: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, copies: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, copies: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, portable: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, portable: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, received: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, received: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, pending: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, pending: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, example: "W".repeat(35) },
  },
  { ...DEFAULT_INPUT, tools: { ...DEFAULT_INPUT.tools, extra: true } },
  {
    ...DEFAULT_INPUT,
    artifacts: DEFAULT_INPUT.artifacts.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
];
