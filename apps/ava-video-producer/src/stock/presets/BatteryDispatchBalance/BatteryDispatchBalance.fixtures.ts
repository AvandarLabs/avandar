import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./BatteryDispatchBalance.schema";
/** Complete fictional inputs for the bounded stock animation. */
export const DEFAULT_INPUT: Input = {
  battery: {
    capacityKwh: 12,
    initialStoredKwh: 0,
  },
  cycle: {
    chargeInputKwh: 10,
    chargeLossKwh: 1,
    deliveredKwh: 8,
    dischargeLossKwh: 1,
  },
  windows: {
    chargeLabel: "Fictional midday window",
    dispatchLabel: "Fictional evening window",
    sourceLabel: "Charging supply",
    loadLabel: "Flexible load",
  },
  decision: {
    actorLabel: "Energy operator",
    actionLabel: "Execute dispatch schedule",
  },
  showLossChannels: true,
  orientation: "horizontal",
  copy: {
    capacity: "Usable capacity",
    stored: "Stored energy",
    input: "Charging input",
    delivered: "Delivered energy",
    chargeLoss: "Charging loss",
    dischargeLoss: "Discharging loss",
    unit: "kWh",
    disclaimer: "Fictional cycle; no emissions claim",
  },
};
/** Invalid authored documents are rejected instead of silently repaired. */
export const invalidInputs: unknown[] = [{}, { ...DEFAULT_INPUT, extra: true }];
/** Changed input independently exercises the central semantic invariant. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  battery: { capacityKwh: 12, initialStoredKwh: 2 },
  cycle: {
    chargeInputKwh: 7,
    chargeLossKwh: 0.5,
    deliveredKwh: 5,
    dischargeLossKwh: 0.75,
  },
};
invalidInputs.push(
  { ...DEFAULT_INPUT, cycle: { ...DEFAULT_INPUT.cycle, chargeLossKwh: 11 } },
  { ...DEFAULT_INPUT, battery: { capacityKwh: 4, initialStoredKwh: 0 } },
  { ...DEFAULT_INPUT, cycle: { ...DEFAULT_INPUT.cycle, deliveredKwh: 10 } },
);
const minimum: Input = {
  ...DEFAULT_INPUT,
  battery: { capacityKwh: 1, initialStoredKwh: 0 },
  cycle: {
    chargeInputKwh: 0,
    chargeLossKwh: 0,
    deliveredKwh: 0,
    dischargeLossKwh: 0,
  },
  showLossChannels: false,
  orientation: "vertical",
};
const dense: Input = {
  ...changedInput,
  windows: {
    chargeLabel: "界".repeat(32),
    dispatchLabel: "界".repeat(32),
    sourceLabel: "界".repeat(32),
    loadLabel: "界".repeat(32),
  },
  decision: { actorLabel: "界".repeat(32), actionLabel: "界".repeat(32) },
  copy: {
    capacity: "界".repeat(26),
    stored: "界".repeat(26),
    input: "界".repeat(26),
    delivered: "界".repeat(26),
    chargeLoss: "界".repeat(26),
    dischargeLoss: "界".repeat(26),
    unit: "界".repeat(8),
    disclaimer: "界".repeat(48),
  },
};
/**
 * Accepted extremes include empty cycles, loss-only input and full drainage.
 */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changedInput },
  {
    id: "vertical-dense",
    input: { ...dense, orientation: "vertical" as const },
  },
  {
    id: "all-charge-lost",
    input: {
      ...minimum,
      cycle: {
        chargeInputKwh: 1,
        chargeLossKwh: 1,
        deliveredKwh: 0,
        dischargeLossKwh: 0,
      },
    },
  },
  {
    id: "fractional-drain",
    input: {
      ...DEFAULT_INPUT,
      battery: { capacityKwh: 0.3, initialStoredKwh: 0.1 },
      cycle: {
        chargeInputKwh: 0.2,
        chargeLossKwh: 0.1,
        deliveredKwh: 0.1,
        dischargeLossKwh: 0.1,
      },
    },
  },
];
