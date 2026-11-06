import { DEFAULT_INPUT } from "./defaultInput";
/** Rejected structural, boundary and cross-field inputs. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "crop"),
  ),
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "cultivator"),
  ),
  {
    ...DEFAULT_INPUT,
    cultivator: { ...DEFAULT_INPUT.cultivator, extra: true },
  },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(([field]) => field !== "seasons"),
  ),
  { ...DEFAULT_INPUT, seasons: { ...DEFAULT_INPUT.seasons, extra: true } },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "balanceLabels",
    ),
  ),
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, extra: true },
  },
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "evidenceLabel",
    ),
  ),
  Object.fromEntries(
    Object.entries(DEFAULT_INPUT).filter(
      ([field]) => field !== "showQuantities",
    ),
  ),
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, label: "WWWWWWWWWWWWWWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, label: "" } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, symbol: "invalid" } },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, unitLabel: "WWWWWWWWWWWWW" },
  },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, unitLabel: "" } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, harvestQuantity: -0.01 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, harvestQuantity: 10001 } },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, reservedQuantity: -0.01 },
  },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, reservedQuantity: 10001 },
  },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, storageLossQuantity: -0.01 },
  },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, storageLossQuantity: 10001 },
  },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, sownQuantity: -0.01 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, sownQuantity: 10001 } },
  {
    ...DEFAULT_INPUT,
    cultivator: {
      ...DEFAULT_INPUT.cultivator,
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, cultivator: { ...DEFAULT_INPUT.cultivator, label: "" } },
  {
    ...DEFAULT_INPUT,
    cultivator: { ...DEFAULT_INPUT.cultivator, mode: "invalid" },
  },
  {
    ...DEFAULT_INPUT,
    cultivator: {
      ...DEFAULT_INPUT.cultivator,
      choiceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    cultivator: { ...DEFAULT_INPUT.cultivator, choiceLabel: "" },
  },
  {
    ...DEFAULT_INPUT,
    seasons: {
      ...DEFAULT_INPUT.seasons,
      harvestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, seasons: { ...DEFAULT_INPUT.seasons, harvestLabel: "" } },
  {
    ...DEFAULT_INPUT,
    seasons: {
      ...DEFAULT_INPUT.seasons,
      storageLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  { ...DEFAULT_INPUT, seasons: { ...DEFAULT_INPUT.seasons, storageLabel: "" } },
  {
    ...DEFAULT_INPUT,
    seasons: {
      ...DEFAULT_INPUT.seasons,
      plantingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    seasons: { ...DEFAULT_INPUT.seasons, plantingLabel: "" },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: {
      ...DEFAULT_INPUT.balanceLabels,
      currentUse: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, currentUse: "" },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: {
      ...DEFAULT_INPUT.balanceLabels,
      reserved: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, reserved: "" },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: {
      ...DEFAULT_INPUT.balanceLabels,
      storageLoss: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, storageLoss: "" },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: {
      ...DEFAULT_INPUT.balanceLabels,
      sown: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, sown: "" },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: {
      ...DEFAULT_INPUT.balanceLabels,
      remaining: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    ...DEFAULT_INPUT,
    balanceLabels: { ...DEFAULT_INPUT.balanceLabels, remaining: "" },
  },
  {
    ...DEFAULT_INPUT,
    evidenceLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  { ...DEFAULT_INPUT, evidenceLabel: "" },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, harvestQuantity: 0 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, reservedQuantity: 13 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, storageLossQuantity: 5 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, sownQuantity: 3.01 } },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, harvestQuantity: 8.031 } },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, harvestQuantity: Infinity },
  },
  {
    ...DEFAULT_INPUT,
    crop: { ...DEFAULT_INPUT.crop, harvestQuantity: -Infinity },
  },
  { ...DEFAULT_INPUT, crop: { ...DEFAULT_INPUT.crop, harvestQuantity: NaN } },
];
