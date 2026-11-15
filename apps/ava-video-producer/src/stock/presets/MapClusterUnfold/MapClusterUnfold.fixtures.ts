import type { Input } from "./MapClusterUnfold.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  points: [
    {
      id: "a",
      label: "Point A",
      x: 20,
      y: 30,
      clusterId: "west",
    },
    {
      id: "b",
      label: "Point B",
      x: 28,
      y: 45,
      clusterId: "west",
    },
    {
      id: "c",
      label: "Point C",
      x: 72,
      y: 40,
      clusterId: "east",
    },
    {
      id: "d",
      label: "Point D",
      x: 80,
      y: 55,
      clusterId: "east",
    },
  ],
  clusters: [
    {
      id: "west",
      label: "West cluster",
      x: 24,
      y: 38,
    },
    {
      id: "east",
      label: "East cluster",
      x: 76,
      y: 48,
    },
  ],
  labels: {
    points: "Individual records",
    clusters: "Grouped display",
    total: "Same supplied points",
  },
  showMemberIds: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Default, minimum, dense and changed-input cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: { ...DEFAULT_INPUT } },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      points: [
        { id: "", label: "", x: 20, y: 30, clusterId: "" },
        { id: "b", label: "", x: 28, y: 45, clusterId: "" },
        { id: "c", label: "", x: 72, y: 40, clusterId: "" },
      ],
      clusters: [{ id: "", label: "", x: 50, y: 50 }],
      showMemberIds: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      points: [
        { id: "0", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "1", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "2", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "3", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "4", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "5", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "6", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
        { id: "7", label: "WWWWWWWWWWWWWWWW", x: 50, y: 50, clusterId: "same" },
      ],
      clusters: [{ id: "same", label: "WWWWWWWWWWWWWWWWWWWW", x: 50, y: 50 }],
      labels: {
        points: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        clusters: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        total: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      copy: {
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      points: [
        { id: "a", label: "Point A", x: 20, y: 30, clusterId: "west" },
        { id: "b", label: "Point B", x: 28, y: 45, clusterId: "east" },
        { id: "c", label: "Point C", x: 72, y: 40, clusterId: "east" },
        { id: "d", label: "Point D", x: 80, y: 55, clusterId: "east" },
      ],
      showMemberIds: false,
    },
  },
];
/** Strict-schema rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    points: [
      { id: "a", label: "Point A", x: 20, y: 30, clusterId: "absent" },
      { id: "b", label: "Point B", x: 28, y: 45, clusterId: "absent" },
      { id: "c", label: "Point C", x: 72, y: 40, clusterId: "absent" },
      { id: "d", label: "Point D", x: 80, y: 55, clusterId: "absent" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    clusters: [
      { id: "west", label: "West cluster", x: 24, y: 38 },
      { id: "east", label: "East cluster", x: 76, y: 48 },
      { id: "empty", label: "", x: 50, y: 50 },
    ],
  },
  {
    ...DEFAULT_INPUT,
    points: [
      {
        id: "WWWWWWWWWWWWW",
        label: "Point A",
        x: 20,
        y: 30,
        clusterId: "west",
      },
      {
        id: "WWWWWWWWWWWWW",
        label: "Point B",
        x: 28,
        y: 45,
        clusterId: "west",
      },
      {
        id: "WWWWWWWWWWWWW",
        label: "Point C",
        x: 72,
        y: 40,
        clusterId: "east",
      },
      {
        id: "WWWWWWWWWWWWW",
        label: "Point D",
        x: 80,
        y: 55,
        clusterId: "east",
      },
    ],
  },
  {
    ...DEFAULT_INPUT,
    clusters: [
      { id: "WWWWWWWWWWWWW", label: "West cluster", x: 24, y: 38 },
      { id: "WWWWWWWWWWWWW", label: "East cluster", x: 76, y: 48 },
    ],
  },
];
