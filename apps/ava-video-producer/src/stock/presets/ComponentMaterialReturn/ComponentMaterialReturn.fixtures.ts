import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Complete fictional default content. */
export const DEFAULT_INPUT: Input = {
  parts: [
    {
      id: "shell",
      label: "Shell",
      massKg: 4,
      route: "reuse",
    },
    {
      id: "motor",
      label: "Motor",
      massKg: 2,
      route: "repair",
    },
    {
      id: "frame",
      label: "Frame",
      massKg: 3,
      route: "recycle",
    },
    {
      id: "filter",
      label: "Filter",
      massKg: 1,
      route: "residue",
    },
  ],
  replacementInputs: [
    {
      id: "replacement",
      label: "Replacement module",
      massKg: 2,
    },
  ],
  decision: {
    actorLabel: "Repair operator",
    actionLabel: "Apply component disposition",
  },
  assemblyShape: "equipment-module",
  showMassEquation: true,
  copy: {
    returned: "Returned assembly",
    replacement: "External replacement input",
    reuse: "Reuse",
    repair: "Repair",
    recycle: "To recycling",
    residue: "Residue",
    output: "Reassembled output",
    unit: "kg",
    disclaimer: "Fictional material accounting",
  },
};
/** A genuinely changed authored scenario. */
export const CHANGED_INPUT: Input = {
  parts: [
    {
      id: "shell",
      label: "Shell",
      massKg: 4,
      route: "residue",
    },
    {
      id: "motor",
      label: "Motor",
      massKg: 2,
      route: "repair",
    },
    {
      id: "frame",
      label: "Frame",
      massKg: 3,
      route: "recycle",
    },
    {
      id: "filter",
      label: "Filter",
      massKg: 1,
      route: "residue",
    },
  ],
  replacementInputs: [],
  decision: {
    actorLabel: "Repair operator",
    actionLabel: "Apply component disposition",
  },
  assemblyShape: "equipment-module",
  showMassEquation: true,
  copy: {
    returned: "Returned assembly",
    replacement: "External replacement input",
    reuse: "Reuse",
    repair: "Repair",
    recycle: "To recycling",
    residue: "Residue",
    output: "Reassembled output",
    unit: "kg",
    disclaimer: "Fictional material accounting",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  parts: [
    { id: "", label: "", massKg: 0.25, route: "recycle" },
    { id: "零 part", label: "", massKg: 0.125, route: "residue" },
  ],
  replacementInputs: [],
  assemblyShape: "appliance",
  showMassEquation: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  copy: {
    returned: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    replacement: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    reuse: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    repair: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    recycle: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    residue: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    output: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    ...DEFAULT_INPUT.decision,
    actorLabel: "W".repeat(34),
    actionLabel: "W".repeat(34),
  },
  parts: Array.from({ length: 6 }, (_, index) => ({
    id: `part-${index}`,
    label: "W".repeat(22),
    massKg: index + 0.25,
    route: index % 2 ? "repair" : "reuse",
  })),
  replacementInputs: Array.from({ length: 3 }, (_, index) => ({
    id: `new-${index}`,
    label: "W".repeat(26),
    massKg: index + 0.5,
  })),
};
const extraFixtures: StockContract<Input>["fixtures"] = (
  ["appliance", "equipment-module"] as const
).flatMap((assemblyShape) =>
  (["reuse", "repair", "recycle", "residue"] as const).map((route) => ({
    id: `${assemblyShape}-${route}`,
    input: {
      ...dense,
      assemblyShape,
      parts: dense.parts.map((part) => ({ ...part, route })),
      replacementInputs:
        route === "recycle" || route === "residue"
          ? []
          : dense.replacementInputs,
      showMassEquation: false,
    },
  })),
);
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    replacementInputs: [{ id: "shell", label: "Replacement", massKg: 1 }],
  },
  { ...DEFAULT_INPUT, parts: [DEFAULT_INPUT.parts[0], DEFAULT_INPUT.parts[0]] },
  {
    ...DEFAULT_INPUT,
    parts: DEFAULT_INPUT.parts.map((part) => ({ ...part, massKg: 0 })),
  },
];

/** Default, minimum, dense, changed and concentrated/alternate fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: CHANGED_INPUT },
  ...extraFixtures,
];
