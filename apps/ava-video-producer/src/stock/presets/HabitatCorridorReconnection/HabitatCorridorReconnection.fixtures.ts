import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./HabitatCorridorReconnection.schema";
/** Complete fictional inputs for the bounded stock animation. */
export const DEFAULT_INPUT: Input = {
  patches: [
    {
      id: "west",
      label: "Habitat patch A",
      areaHa: 3,
    },
    {
      id: "east",
      label: "Habitat patch B",
      areaHa: 4,
    },
  ],
  corridor: {
    label: "Proposed habitat connection",
    lengthM: 200,
    widthM: 20,
    fromPatchId: "west",
    toPatchId: "east",
  },
  landBoundaryHa: 20,
  decision: {
    actorLabel: "Land management team",
    actionLabel: "Allocate corridor footprint",
    stage: "proposal",
  },
  showIllustrativeTraversal: false,
  showLandBalance: true,
  copy: {
    map: "Schematic land-use plan",
    barrier: "Road barrier",
    crossing: "Designed crossing",
    habitat: "Habitat area",
    otherLand: "Other land",
    proposal: "Proposed",
    implemented: "Implemented",
    traversal: "Illustrative route only",
    areaUnit: "ha",
    lengthUnit: "m",
    disclaimer: "Fictional plan; no ecological outcome claim",
  },
};
/** Invalid authored documents are rejected instead of silently repaired. */
export const invalidInputs: unknown[] = [{}, { ...DEFAULT_INPUT, extra: true }];
/** Changed input independently exercises the central semantic invariant. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  corridor: {
    ...DEFAULT_INPUT.corridor,
    lengthM: 250,
    widthM: 40,
    fromPatchId: "east",
    toPatchId: "west",
  },
  showIllustrativeTraversal: true,
};
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    corridor: { ...DEFAULT_INPUT.corridor, toPatchId: "west" },
  },
  { ...DEFAULT_INPUT, landBoundaryHa: 7 },
  { ...DEFAULT_INPUT, patches: [] },
);
const minimum: Input = {
  ...DEFAULT_INPUT,
  patches: [
    { id: "", label: "", areaHa: 0.1 },
    { id: "空 地", label: "", areaHa: 0.2 },
  ],
  corridor: {
    label: "",
    lengthM: 1e-300,
    widthM: 1e-300,
    fromPatchId: "",
    toPatchId: "空 地",
  },
  landBoundaryHa: 0.1 + 0.2,
  showLandBalance: false,
};
const dense: Input = {
  ...changedInput,
  patches: changedInput.patches.map((patch) => ({
    ...patch,
    label: "界".repeat(24),
  })),
  corridor: { ...changedInput.corridor, label: "界".repeat(32) },
  decision: {
    actorLabel: "界".repeat(34),
    actionLabel: "界".repeat(34),
    stage: "implemented",
  },
  copy: {
    map: "界".repeat(28),
    barrier: "界".repeat(28),
    crossing: "界".repeat(28),
    habitat: "界".repeat(28),
    otherLand: "界".repeat(28),
    proposal: "界".repeat(28),
    implemented: "界".repeat(28),
    traversal: "界".repeat(28),
    areaUnit: "界".repeat(8),
    lengthUnit: "界".repeat(8),
    disclaimer: "界".repeat(54),
  },
};
/** Both authored stages keep traversal illustrative and area conserved. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changedInput },
  {
    id: "zero-other-land",
    input: {
      ...DEFAULT_INPUT,
      landBoundaryHa: 7.4,
      showIllustrativeTraversal: true,
    },
  },
  {
    id: "empty-endpoint-traversal",
    input: { ...minimum, showIllustrativeTraversal: true },
  },
  {
    id: "proposal-dense",
    input: {
      ...dense,
      decision: { ...dense.decision, stage: "proposal" as const },
    },
  },
];
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    corridor: { ...DEFAULT_INPUT.corridor, fromPatchId: "missing" },
  },
  {
    ...DEFAULT_INPUT,
    patches: DEFAULT_INPUT.patches.map((patch) => ({ ...patch, id: "same" })),
  },
);
