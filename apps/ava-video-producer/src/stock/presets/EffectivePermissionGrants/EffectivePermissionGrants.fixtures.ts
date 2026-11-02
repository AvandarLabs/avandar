import type { Input } from "./EffectivePermissionGrants.schema";
/** Complete fictional default, used only when the entire input is omitted. */
export const DEFAULT_INPUT: Input = {
  grants: [
    {
      id: "app",
      label: "App default",
      kind: "app-default",
      role: "editor",
      eligible: true,
    },
    {
      id: "team",
      label: "Team share",
      kind: "group",
      role: "viewer",
      eligible: true,
    },
    {
      id: "direct",
      label: "Direct share",
      kind: "direct",
      role: "admin",
      eligible: false,
    },
  ],
  restricted: true,
  requiredRole: "editor",
  labels: {
    resource: "Fictional shared report",
    none: "None",
    viewer: "View",
    editor: "Edit",
    admin: "Manage",
    allowed: "Action allowed",
    denied: "Action denied",
  },
  showExcludedGrants: true,
};
/** Minimum, dense and changed inputs, including semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      grants: [
        {
          ...DEFAULT_INPUT.grants[0],
          id: "a",
          label: "A",
          kind: "workspace",
          role: "viewer",
        },
      ],
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      grants: [
        {
          ...DEFAULT_INPUT.grants[0],
          id: "g0",
          label: "WWWWWWWWWWWWWWWWWWWW",
          role: "admin",
        },
        {
          ...DEFAULT_INPUT.grants[1],
          id: "g1",
          label: "WWWWWWWWWWWWWWWWWWWW",
          kind: "direct",
        },
        {
          ...DEFAULT_INPUT.grants[2],
          id: "g2",
          label: "WWWWWWWWWWWWWWWWWWWW",
          kind: "group",
          role: "editor",
          eligible: true,
        },
        {
          id: "g3",
          label: "WWWWWWWWWWWWWWWWWWWW",
          kind: "workspace",
          role: "admin",
          eligible: false,
        },
        {
          id: "g4",
          label: "WWWWWWWWWWWWWWWWWWWW",
          kind: "direct",
          role: "viewer",
          eligible: true,
        },
      ],
      labels: {
        ...DEFAULT_INPUT.labels,
        resource: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        none: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        viewer: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        editor: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        admin: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        allowed: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        denied: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: { ...DEFAULT_INPUT, restricted: false, showExcludedGrants: false },
  },
  {
    id: "none",
    input: {
      ...DEFAULT_INPUT,
      grants: [
        { ...DEFAULT_INPUT.grants[0], eligible: false },
        { ...DEFAULT_INPUT.grants[1], eligible: false },
        DEFAULT_INPUT.grants[2],
      ],
    },
  },
  {
    id: "direct-admin",
    input: {
      ...DEFAULT_INPUT,
      grants: [
        DEFAULT_INPUT.grants[0],
        DEFAULT_INPUT.grants[1],
        { ...DEFAULT_INPUT.grants[2], eligible: true },
      ],
    },
  },
];
/** Structural, reference and arithmetic rejection examples. */
export const invalidInputs: unknown[] = [
  undefined,
  null,
  {},
  { ...DEFAULT_INPUT, grants: [] },
  {
    ...DEFAULT_INPUT,
    grants: [
      DEFAULT_INPUT.grants[0],
      DEFAULT_INPUT.grants[1],
      DEFAULT_INPUT.grants[2],
      {
        id: "app",
        label: "App default",
        kind: "app-default",
        role: "editor",
        eligible: true,
      },
      {
        id: "team",
        label: "Team share",
        kind: "group",
        role: "viewer",
        eligible: true,
      },
      {
        id: "direct",
        label: "Direct share",
        kind: "direct",
        role: "admin",
        eligible: false,
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    grants: [
      DEFAULT_INPUT.grants[0],
      {
        ...DEFAULT_INPUT.grants[1],
        id: "app",
        label: "App default",
        kind: "app-default",
        role: "editor",
      },
    ],
  },
  { ...DEFAULT_INPUT, grants: [{ ...DEFAULT_INPUT.grants[0], id: "" }] },
  {
    ...DEFAULT_INPUT,
    grants: [{ ...DEFAULT_INPUT.grants[0], id: "xxxxxxxxxxxxx" }],
  },
  { ...DEFAULT_INPUT, grants: [{ ...DEFAULT_INPUT.grants[0], label: "" }] },
  {
    ...DEFAULT_INPUT,
    grants: [{ ...DEFAULT_INPUT.grants[0], label: "xxxxxxxxxxxxxxxxxxxxx" }],
  },
  { ...DEFAULT_INPUT, grants: [{ ...DEFAULT_INPUT.grants[0], kind: "owner" }] },
  { ...DEFAULT_INPUT, grants: [{ ...DEFAULT_INPUT.grants[0], role: "none" }] },
  {
    ...DEFAULT_INPUT,
    grants: [{ ...DEFAULT_INPUT.grants[0], eligible: "yes" }],
  },
  { ...DEFAULT_INPUT, grants: [{ ...DEFAULT_INPUT.grants[0], extra: true }] },
  { ...DEFAULT_INPUT, requiredRole: "owner" },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, resource: "" } },
  {
    ...DEFAULT_INPUT,
    labels: {
      ...DEFAULT_INPUT.labels,
      resource: "WWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, none: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, none: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, viewer: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, viewer: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, editor: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, editor: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, admin: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, admin: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, allowed: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, allowed: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, denied: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, denied: "WWWWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  { ...DEFAULT_INPUT, extra: true },
];
