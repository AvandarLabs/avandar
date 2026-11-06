import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./StormwaterStorageSpill.schema";
/** Complete fictional default content. */
export const DEFAULT_INPUT: Input = {
  event: {
    incomingM3: 120,
    infiltratedM3: 20,
    dischargedM3: 50,
  },
  detentionCapacityM3: 40,
  boundary: {
    locationLabel: "Schematic demonstration block",
    periodLabel: "One fictional storm event",
  },
  decision: {
    actorLabel: "Drainage operator",
    actionLabel: "Set event outlet plan",
  },
  overflowSide: "right",
  showBalance: true,
  copy: {
    inflow: "Event inflow",
    infiltration: "Infiltrated",
    discharge: "Controlled discharge",
    detained: "Detained at event end",
    overflow: "Overflow",
    capacity: "Storage capacity",
    unit: "m3",
    disclaimer: "Fictional volumes; not a flood forecast",
  },
};
/** A genuinely changed authored scenario. */
export const CHANGED_INPUT: Input = {
  event: {
    incomingM3: 120,
    infiltratedM3: 20,
    dischargedM3: 50,
  },
  detentionCapacityM3: 0,
  boundary: {
    locationLabel: "Schematic demonstration block",
    periodLabel: "One fictional storm event",
  },
  decision: {
    actorLabel: "Drainage operator",
    actionLabel: "Set event outlet plan",
  },
  overflowSide: "left",
  showBalance: true,
  copy: {
    inflow: "Event inflow",
    infiltration: "Infiltrated",
    discharge: "Controlled discharge",
    detained: "Detained at event end",
    overflow: "Overflow",
    capacity: "Storage capacity",
    unit: "m3",
    disclaimer: "Fictional volumes; not a flood forecast",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  event: { incomingM3: 1e-12, infiltratedM3: 0, dischargedM3: 0 },
  detentionCapacityM3: 0,
  overflowSide: "left",
  showBalance: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  copy: {
    inflow: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    infiltration: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    discharge: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    detained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    overflow: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    capacity: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    ...DEFAULT_INPUT.decision,
    actorLabel: "W".repeat(32),
    actionLabel: "W".repeat(32),
  },
  boundary: {
    locationLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    periodLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  event: { incomingM3: 10000, infiltratedM3: 2500, dischargedM3: 2500 },
  detentionCapacityM3: 2500,
};
const extraFixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  {
    id: "all-infiltrated",
    input: {
      ...DEFAULT_INPUT,
      event: { incomingM3: 120, infiltratedM3: 120, dischargedM3: 0 },
    },
  },
  {
    id: "all-discharged",
    input: {
      ...DEFAULT_INPUT,
      event: { incomingM3: 120, infiltratedM3: 0, dischargedM3: 120 },
    },
  },
  { id: "no-overflow", input: { ...DEFAULT_INPUT, detentionCapacityM3: 50 } },
  {
    id: "overflow-only",
    input: {
      ...DEFAULT_INPUT,
      event: { incomingM3: 120, infiltratedM3: 0, dischargedM3: 0 },
      detentionCapacityM3: 0,
    },
  },
  {
    id: "left-hidden",
    input: { ...dense, overflowSide: "left" as const, showBalance: false },
  },
];
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {
    ...DEFAULT_INPUT,
    event: { incomingM3: 120, infiltratedM3: 70, dischargedM3: 51 },
  },
  { ...DEFAULT_INPUT, event: { ...DEFAULT_INPUT.event, incomingM3: 0 } },
  { ...DEFAULT_INPUT, detentionCapacityM3: -1 },
];

/** Default, minimum, dense, changed and concentrated/alternate fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: CHANGED_INPUT },
  ...extraFixtures,
];
