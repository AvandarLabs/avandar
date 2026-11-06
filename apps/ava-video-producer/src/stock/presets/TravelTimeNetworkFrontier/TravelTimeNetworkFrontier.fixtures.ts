import type { Input } from "./TravelTimeNetworkFrontier.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  nodes: [
    { id: "o", label: "Origin", x: 20, y: 50 },
    { id: "a", label: "Stop A", x: 45, y: 30 },
    { id: "b", label: "Stop B", x: 75, y: 35 },
    { id: "c", label: "Stop C", x: 35, y: 75 },
  ],
  roads: [
    { id: "oa", fromId: "o", toId: "a", minutes: 3 },
    { id: "ab", fromId: "a", toId: "b", minutes: 3 },
    { id: "oc", fromId: "o", toId: "c", minutes: 10 },
  ],
  originId: "o",
  budgetMinutes: 7,
  modeLabel: "Fictional walking network",
  showCosts: true,
};
/** Alternate input and toggles. */
export const CHANGED_INPUT: Input = {
  nodes: [
    { id: "o", label: "Origin", x: 20, y: 50 },
    { id: "a", label: "Stop A", x: 45, y: 30 },
    { id: "b", label: "Stop B", x: 75, y: 35 },
    { id: "c", label: "Stop C", x: 21, y: 75 },
  ],
  roads: [
    { id: "oa", fromId: "o", toId: "a", minutes: 3 },
    { id: "ab", fromId: "a", toId: "b", minutes: 3 },
    { id: "oc", fromId: "o", toId: "c", minutes: 10 },
  ],
  originId: "o",
  budgetMinutes: 10,
  modeLabel: "Fictional walking network",
  showCosts: false,
};
/** Default, minimum, dense and changed documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      nodes: [
        { id: "", label: "", x: 5, y: 5 },
        { id: "a b", label: "", x: 95, y: 95 },
        { id: "界", label: "", x: 50, y: 50 },
      ],
      roads: [
        { id: "", fromId: "", toId: "a b", minutes: 1 },
        {
          id: "界界界界界界界界界界界界",
          fromId: "a b",
          toId: "界",
          minutes: 1,
        },
      ],
      originId: "",
      budgetMinutes: 1,
      modeLabel: "Fictional walking network",
      showCosts: true,
    },
  },
  {
    id: "dense",
    input: {
      nodes: [
        { id: "0", label: "MMMMMMMMMMMMMMMM", x: 15, y: 25 },
        { id: "1", label: "MMMMMMMMMMMMMMMM", x: 29, y: 75 },
        { id: "2", label: "MMMMMMMMMMMMMMMM", x: 43, y: 25 },
        { id: "3", label: "MMMMMMMMMMMMMMMM", x: 57, y: 75 },
        { id: "4", label: "MMMMMMMMMMMMMMMM", x: 71, y: 25 },
        { id: "5", label: "MMMMMMMMMMMMMMMM", x: 85, y: 75 },
      ],
      roads: [
        { id: "0", fromId: "0", toId: "1", minutes: 1 },
        { id: "1", fromId: "1", toId: "2", minutes: 2 },
        { id: "2", fromId: "2", toId: "3", minutes: 3 },
        { id: "3", fromId: "3", toId: "4", minutes: 4 },
        { id: "4", fromId: "4", toId: "5", minutes: 5 },
        { id: "5", fromId: "0", toId: "4", minutes: 2 },
        { id: "6", fromId: "0", toId: "5", minutes: 20 },
      ],
      originId: "0",
      budgetMinutes: 7,
      modeLabel: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      showCosts: true,
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural and semantic rejection cases. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, nodes: [] },
  { ...DEFAULT_INPUT, originId: "missing" },
  { ...DEFAULT_INPUT, roads: DEFAULT_INPUT.roads.slice(1) },
  {
    ...DEFAULT_INPUT,
    roads: [
      ...DEFAULT_INPUT.roads,
      { id: "reverse", fromId: "a", toId: "o", minutes: 2 },
    ],
  },
  { ...DEFAULT_INPUT, budgetMinutes: 1.2 },
  {
    ...DEFAULT_INPUT,
    nodes: DEFAULT_INPUT.nodes.map((node, index) => ({
      ...node,
      id: index === 0 ? "x".repeat(13) : node.id,
    })),
  },
  {
    ...DEFAULT_INPUT,
    roads: DEFAULT_INPUT.roads.map((road) => ({ ...road, id: "x".repeat(13) })),
  },
  {
    ...DEFAULT_INPUT,
    roads: DEFAULT_INPUT.roads.map((road) => ({ ...road, toId: road.fromId })),
  },
];
