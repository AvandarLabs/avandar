import { DEFAULT_INPUT } from "./defaultInput";
import type { Input } from "./SavedSeedSeasonReturn.schema";
export { DEFAULT_INPUT as defaultInput } from "./defaultInput";
export { invalidInputs } from "./invalidInputs";
/** Accepted minimum, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      crop: {
        ...DEFAULT_INPUT.crop,
        harvestQuantity: 0.01,
        reservedQuantity: 0,
        storageLossQuantity: 0,
        sownQuantity: 0,
      },
      cultivator: { ...DEFAULT_INPUT.cultivator, choiceLabel: "Keep no seed" },
      showQuantities: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      crop: {
        ...DEFAULT_INPUT.crop,
        label: "界界界界界界界界界界界界界界界界界界界界界界界界",
        unitLabel: "界界界界界界界界界界界界",
        harvestQuantity: 10000,
        reservedQuantity: 8030.03,
        storageLossQuantity: 0.03,
        sownQuantity: 8029.99,
      },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        choiceLabel:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      seasons: {
        ...DEFAULT_INPUT.seasons,
        harvestLabel:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        storageLabel:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        plantingLabel:
          "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      balanceLabels: {
        ...DEFAULT_INPUT.balanceLabels,
        currentUse: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        reserved: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        storageLoss: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        sown: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
        remaining: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      },
      evidenceLabel:
        "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      crop: {
        ...DEFAULT_INPUT.crop,
        symbol: "grain",
        harvestQuantity: 8.03,
        reservedQuantity: 3.01,
        storageLossQuantity: 0.01,
        sownQuantity: 2.5,
      },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        mode: "cooperative",
        choiceLabel: "Keep 3.01 kg for planting",
      },
    },
  },
  {
    id: "reserve-all",
    input: {
      ...DEFAULT_INPUT,
      crop: {
        ...DEFAULT_INPUT.crop,
        reservedQuantity: 12,
        storageLossQuantity: 0,
        sownQuantity: 12,
      },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        choiceLabel: "Retain the supplied seed portion",
      },
    },
  },
  {
    id: "all-reserve-lost",
    input: {
      ...DEFAULT_INPUT,
      crop: { ...DEFAULT_INPUT.crop, storageLossQuantity: 4, sownQuantity: 0 },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        choiceLabel: "Retain the supplied seed portion",
      },
    },
  },
  {
    id: "zero-sowing",
    input: {
      ...DEFAULT_INPUT,
      crop: { ...DEFAULT_INPUT.crop, sownQuantity: 0 },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        choiceLabel: "Retain the supplied seed portion",
      },
    },
  },
  {
    id: "decimal",
    input: {
      ...DEFAULT_INPUT,
      crop: {
        ...DEFAULT_INPUT.crop,
        harvestQuantity: 8.03,
        reservedQuantity: 8.03,
        storageLossQuantity: 0.01,
        sownQuantity: 8.02,
      },
      cultivator: {
        ...DEFAULT_INPUT.cultivator,
        choiceLabel: "Retain the supplied seed portion",
      },
    },
  },
];
