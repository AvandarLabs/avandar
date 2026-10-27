import type { Input } from "./ColdChainCustody.schema";
/** Complete fictional default, replaced only as a whole input. */
export const DEFAULT_INPUT: Input = {
  stops: [
    { id: "depot", label: "Example depot", kind: "depot" },
    { id: "vehicle", label: "Cool transport", kind: "vehicle" },
    { id: "clinic", label: "Hill clinic", kind: "clinic" },
  ],
  crates: [
    {
      id: "a",
      label: "Container A",
      checkpoints: [
        {
          stopId: "depot",
          state: "logged",
          acknowledged: true,
          seal: "intact",
        },
        {
          stopId: "vehicle",
          state: "logged",
          acknowledged: true,
          seal: "intact",
        },
        {
          stopId: "clinic",
          state: "logged",
          acknowledged: true,
          seal: "intact",
        },
      ],
      kind: "carrier",
    },
    {
      id: "b",
      label: "Container B",
      checkpoints: [
        {
          stopId: "depot",
          state: "logged",
          acknowledged: true,
          seal: "intact",
        },
        {
          stopId: "vehicle",
          state: "review",
          acknowledged: true,
          seal: "intact",
        },
        {
          stopId: "clinic",
          state: "review",
          acknowledged: true,
          seal: "intact",
        },
      ],
      kind: "carrier",
    },
    {
      id: "c",
      label: "Container C",
      checkpoints: [
        {
          stopId: "depot",
          state: "logged",
          acknowledged: true,
          seal: "intact",
        },
        {
          stopId: "vehicle",
          state: "missing",
          acknowledged: false,
          seal: "unknown",
        },
        {
          stopId: "clinic",
          state: "missing",
          acknowledged: false,
          seal: "unknown",
        },
      ],
      kind: "carrier",
    },
  ],
  sceneLabel: "Fictional example",
  geographyMode: "globe-and-schematic",
  showMonitoring: true,
  showLedger: true,
  copy: {
    schematic: "Schematic route",
    total: "Containers",
    logged: "Record logged",
    review: "Record flagged for review",
    missing: "Record missing",
    arrival: "Received at destination",
    acknowledged: "Acknowledgement recorded",
    receiptMissing: "Acknowledgement missing",
    sealIntact: "Seal recorded intact",
    sealBroken: "Seal recorded broken",
    sealUnknown: "Seal not recorded",
  },
  showIdentityRibbon: true,
};
const minimum: Input = {
  ...DEFAULT_INPUT,
  stops: DEFAULT_INPUT.stops.map((stop, index) =>
    index ? stop : { ...stop, id: "", label: "" },
  ),
  crates: [
    {
      ...DEFAULT_INPUT.crates[0],
      id: "",
      label: "",
      checkpoints: DEFAULT_INPUT.crates[0].checkpoints.map(
        (checkpoint, index) =>
          index ? checkpoint : { ...checkpoint, stopId: "" },
      ),
    },
  ],
};
const dense: Input = {
  ...DEFAULT_INPUT,
  stops: DEFAULT_INPUT.stops.map((stop) => ({
    ...stop,
    label: "界".repeat(24),
  })),
  crates: Array.from({ length: 5 }, (_, index) => ({
    ...DEFAULT_INPUT.crates[index % 3],
    id: `crate ${index}界`,
    label: "界".repeat(20),
  })),
  sceneLabel: "界".repeat(40),
  copy: Object.fromEntries(
    Object.keys(DEFAULT_INPUT.copy).map((key) => [key, "界".repeat(42)]),
  ) as Input["copy"],
};
const changed: Input = {
  ...DEFAULT_INPUT,
  crates: DEFAULT_INPUT.crates.map((crate, index) => ({
    ...crate,
    kind: index === 0 ? "specimen" : crate.kind,
    checkpoints: crate.checkpoints.map((checkpoint, stopIndex) =>
      index === 0 && stopIndex === 2
        ? {
            ...checkpoint,
            state: "logged",
            acknowledged: false,
            seal: "unknown",
          }
        : index === 1 && stopIndex === 1
          ? { ...checkpoint, state: "review", seal: "broken" }
          : checkpoint,
    ),
  })),
};
const toggles: Input = {
  ...changed,
  geographyMode: "schematic-only",
  showMonitoring: false,
  showLedger: false,
  showIdentityRibbon: false,
};
/** Invalid shape, identity and semantic relationship samples. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, stops: [] },
  {
    ...DEFAULT_INPUT,
    crates: [DEFAULT_INPUT.crates[0], DEFAULT_INPUT.crates[0]],
  },
  {
    ...DEFAULT_INPUT,
    crates: [
      {
        ...DEFAULT_INPUT.crates[0],
        checkpoints: DEFAULT_INPUT.crates[0].checkpoints.map(
          (checkpoint, index) =>
            index ? checkpoint : { ...checkpoint, stopId: "absent" },
        ),
      },
    ],
  },
];
/** Accepted minimum, dense, changed and disabled-display examples. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
  { id: "toggles", input: toggles },
];
