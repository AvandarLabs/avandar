import { DEFAULT_INPUT } from "./ReleaseRepairObligations.constants";
import type { Input } from "./ReleaseRepairObligations.schema";
export { DEFAULT_INPUT } from "./ReleaseRepairObligations.constants";

/**
 * Minimum, maximum-density and changed semantics exercise authored variants.
 */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      artifact: { ...DEFAULT_INPUT.artifact, label: "A" },
      issues: [
        {
          ...DEFAULT_INPUT.issues[0],
          id: "a",
          label: "A",
          owner: "",
          dueLabel: "",
        },
      ],
      recipientLabel: "W",
      labels: {
        ready: "R",
        held: "H",
        limitations: "K",
        register: "R",
        resolved: "R",
        open: "S",
        example: "F",
      },
      showResolvedIssues: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      artifact: {
        ...DEFAULT_INPUT.artifact,
        label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      issues: [
        {
          id: "0iiiiiiiiiiiiiiiiiii",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          state: "open",
          releaseRole: "follow-up",
          owner: "WWWWWWWWWWWWWWWWWW",
          dueLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          ...DEFAULT_INPUT.issues[1],
          id: "1iiiiiiiiiiiiiiiiiii",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          owner: "WWWWWWWWWWWWWWWWWW",
          dueLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "2iiiiiiiiiiiiiiiiiii",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          state: "open",
          releaseRole: "follow-up",
          owner: "WWWWWWWWWWWWWWWWWW",
          dueLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        {
          id: "3iiiiiiiiiiiiiiiiiii",
          label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
          state: "open",
          releaseRole: "follow-up",
          owner: "WWWWWWWWWWWWWWWWWW",
          dueLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      recipientLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      labels: {
        ready: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        held: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        limitations: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        register: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        resolved: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        open: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      issues: [
        { ...DEFAULT_INPUT.issues[0], state: "open", owner: "", dueLabel: "" },
        DEFAULT_INPUT.issues[1],
      ],
      showResolvedIssues: false,
      issueMarks: "margin-notches",
    },
  },
];

/** Rejection documents preserve all unaffected input fields. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, issues: [] },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      DEFAULT_INPUT.issues[1],
      DEFAULT_INPUT.issues[0],
      DEFAULT_INPUT.issues[1],
      DEFAULT_INPUT.issues[0],
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [DEFAULT_INPUT.issues[1], DEFAULT_INPUT.issues[1]],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      {
        id: "index",
        label: "Add an index",
        state: "open",
        releaseRole: "follow-up",
        owner: "",
        dueLabel: "Next review",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      {
        id: "index",
        label: "Add an index",
        state: "open",
        releaseRole: "follow-up",
        owner: "Jo",
        dueLabel: "",
      },
    ],
  },
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, artifact: { ...DEFAULT_INPUT.artifact, extra: true } },
  { ...DEFAULT_INPUT, artifact: { ...DEFAULT_INPUT.artifact, label: "" } },
  {
    ...DEFAULT_INPUT,
    artifact: {
      ...DEFAULT_INPUT.artifact,
      label:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    artifact: { ...DEFAULT_INPUT.artifact, kind: "INVALID" },
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      { ...DEFAULT_INPUT.issues[0], extra: true },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      { ...DEFAULT_INPUT.issues[0], label: "" },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      {
        ...DEFAULT_INPUT.issues[0],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      { ...DEFAULT_INPUT.issues[0], state: "INVALID" },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      { ...DEFAULT_INPUT.issues[0], releaseRole: "INVALID" },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      {
        ...DEFAULT_INPUT.issues[0],
        owner:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      {
        ...DEFAULT_INPUT.issues[0],
        dueLabel:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      DEFAULT_INPUT.issues[1],
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], extra: true },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], label: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      {
        ...DEFAULT_INPUT.issues[1],
        label:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], state: "INVALID" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], releaseRole: "INVALID" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], owner: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      {
        ...DEFAULT_INPUT.issues[1],
        owner:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      { ...DEFAULT_INPUT.issues[1], dueLabel: "" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    issues: [
      DEFAULT_INPUT.issues[0],
      {
        ...DEFAULT_INPUT.issues[1],
        dueLabel:
          "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    ],
  },
  { ...DEFAULT_INPUT, recipientLabel: "" },
  {
    ...DEFAULT_INPUT,
    recipientLabel:
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, ready: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      ready:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, held: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      held: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, limitations: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      limitations:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, register: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      register:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, resolved: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      resolved:
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
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      example:
        "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, showResolvedIssues: "true" },
  { ...DEFAULT_INPUT, issueMarks: "INVALID" },
];
