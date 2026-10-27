import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./StreetShadeInstallation.schema";
/** Complete fictional default content. */
export const DEFAULT_INPUT: Input = {
  zones: [
    {
      id: "stop",
      label: "Transit waiting area",
      areaM2: 100,
      existingShadeM2: 20,
    },
    {
      id: "plaza",
      label: "Small plaza",
      areaM2: 100,
      existingShadeM2: 20,
    },
  ],
  installations: [
    {
      id: "awning",
      label: "Proposed awning",
      zoneId: "stop",
      kind: "awning",
      addedShadeM2: 30,
    },
    {
      id: "canopy",
      label: "Authored canopy footprint",
      zoneId: "plaza",
      kind: "tree-canopy",
      addedShadeM2: 30,
    },
  ],
  referenceCondition: "One authored sun position",
  decision: {
    actorLabel: "Local design team",
    actionLabel: "Choose shade locations",
    stage: "proposal",
  },
  showAreaBalance: true,
  copy: {
    map: "Schematic local plan",
    existing: "Existing shade",
    added: "Added shade footprint",
    shaded: "Shaded area",
    unshaded: "Unshaded area",
    proposal: "Proposed",
    installed: "Installed",
    unit: "m2",
    disclaimer: "Fictional design; no cooling estimate",
  },
};
/** A genuinely changed authored scenario. */
export const CHANGED_INPUT: Input = {
  zones: [
    {
      id: "stop",
      label: "Transit waiting area",
      areaM2: 100,
      existingShadeM2: 20,
    },
    {
      id: "plaza",
      label: "Small plaza",
      areaM2: 100,
      existingShadeM2: 20,
    },
  ],
  installations: [
    {
      id: "awning",
      label: "Proposed awning",
      zoneId: "stop",
      kind: "awning",
      addedShadeM2: 60,
    },
    {
      id: "canopy",
      label: "Authored canopy footprint",
      zoneId: "plaza",
      kind: "tree-canopy",
      addedShadeM2: 30,
    },
  ],
  referenceCondition: "One authored sun position",
  decision: {
    actorLabel: "Local design team",
    actionLabel: "Choose shade locations",
    stage: "installed",
  },
  showAreaBalance: true,
  copy: {
    map: "Schematic local plan",
    existing: "Existing shade",
    added: "Added shade footprint",
    shaded: "Shaded area",
    unshaded: "Unshaded area",
    proposal: "Proposed",
    installed: "Installed",
    unit: "m2",
    disclaimer: "Fictional design; no cooling estimate",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  zones: [{ id: "", label: "", areaM2: 0.25, existingShadeM2: 0.25 }],
  installations: [
    { id: "", label: "", zoneId: "", kind: "awning", addedShadeM2: 0 },
  ],
};
const dense: Input = {
  ...DEFAULT_INPUT,
  copy: {
    map: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    existing: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    added: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    shaded: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unshaded: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    proposal: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    installed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    ...DEFAULT_INPUT.decision,
    actorLabel: "W".repeat(32),
    actionLabel: "W".repeat(32),
  },
  referenceCondition: "W".repeat(42),
  zones: Array.from({ length: 4 }, (_, index) => ({
    id: `zone-${index}`,
    label: "W".repeat(26),
    areaM2: [100, 200, 300, 400][index],
    existingShadeM2: 0,
  })),
  installations: Array.from({ length: 4 }, (_, index) => ({
    id: `shade-${index}`,
    label: "W".repeat(28),
    zoneId: "zone-0",
    kind: index % 2 ? "awning" : "tree-canopy",
    addedShadeM2: 25,
  })),
};
const extraFixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  {
    id: "installed-concentrated",
    input: {
      ...dense,
      decision: { ...dense.decision, stage: "installed" as const },
    },
  },
  {
    id: "zero-added",
    input: {
      ...DEFAULT_INPUT,
      installations: DEFAULT_INPUT.installations.map((item) => ({
        ...item,
        addedShadeM2: 0,
      })),
      showAreaBalance: false,
    },
  },
];
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    installations: [{ ...DEFAULT_INPUT.installations[0], zoneId: "missing" }],
  },
  {
    ...DEFAULT_INPUT,
    zones: [{ ...DEFAULT_INPUT.zones[0], existingShadeM2: 101 }],
  },
  {
    ...DEFAULT_INPUT,
    installations: DEFAULT_INPUT.installations.map((item) => ({
      ...item,
      zoneId: "stop",
      addedShadeM2: 50,
    })),
  },
  { ...DEFAULT_INPUT, zones: [DEFAULT_INPUT.zones[0], DEFAULT_INPUT.zones[0]] },
];

/** Default, minimum, dense, changed and concentrated/alternate fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: CHANGED_INPUT },
  ...extraFixtures,
];
