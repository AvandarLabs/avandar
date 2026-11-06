import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SpecimenAliquotBalance.schema";
/** Complete fictional authored defaults. */
export const DEFAULT_INPUT: Input = {
  parent: {
    id: "EX-P",
    label: "Parent specimen",
    volume: 6,
  },
  aliquots: [
    {
      id: "EX-P-A",
      label: "Aliquot A",
      volume: 2,
    },
    {
      id: "EX-P-B",
      label: "Aliquot B",
      volume: 3,
    },
  ],
  unitLabel: "schematic units",
  sceneLabel: "Fictional example",
  showLineage: true,
  showEquation: true,
  copy: {
    source: "Source specimens",
    tubes: "Containers shown",
    remainder: "Parent remainder",
    transferred: "Transferred volume",
    parentVolume: "Starting volume",
  },
};

const minimumInput: Input = {
  ...DEFAULT_INPUT,
  parent: { id: "", label: "", volume: 1 },
  aliquots: [{ id: "child 空", label: "", volume: 1 }],
};
const denseInput: Input = {
  ...DEFAULT_INPUT,
  parent: { id: "source 空", label: "W".repeat(24), volume: 12 },
  aliquots: [1, 2, 3, 5].map((volume, index) => ({
    id: `child ${index}`,
    label: "W".repeat(20),
    volume,
  })),
  unitLabel: "W".repeat(20),
  sceneLabel: "W".repeat(40),
  copy: {
    source: "W".repeat(42),
    tubes: "W".repeat(42),
    remainder: "W".repeat(42),
    transferred: "W".repeat(42),
    parentVolume: "W".repeat(42),
  },
};
/** Changes the physical source and the number and volumes of child tubes. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  parent: { ...DEFAULT_INPUT.parent, volume: 12 },
  aliquots: [{ id: "最大", label: "All source volume", volume: 12 }],
};
const toggledInput: Input = {
  ...denseInput,
  showLineage: false,
  showEquation: false,
};
/** Invalid volume conservation, identity, bounds and nested shape examples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, aliquots: [] },
  { ...DEFAULT_INPUT, parent: { ...DEFAULT_INPUT.parent, volume: 1 } },
  {
    ...DEFAULT_INPUT,
    aliquots: [{ ...DEFAULT_INPUT.aliquots[0], id: DEFAULT_INPUT.parent.id }],
  },
  {
    ...DEFAULT_INPUT,
    aliquots: [DEFAULT_INPUT.aliquots[0], DEFAULT_INPUT.aliquots[0]],
  },
  { ...DEFAULT_INPUT, parent: { ...DEFAULT_INPUT.parent, volume: 1.5 } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: "invalid" } },
  { ...DEFAULT_INPUT, unitLabel: "" },
  { ...DEFAULT_INPUT, sceneLabel: "W".repeat(41) },
];
/** Default, minimum, dense, changed and toggled complete examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "toggled", input: toggledInput },
];
