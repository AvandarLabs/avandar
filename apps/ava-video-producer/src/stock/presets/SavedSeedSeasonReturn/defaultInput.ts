import type { Input } from "./SavedSeedSeasonReturn.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  crop: {
    label: "Demo beans",
    symbol: "bean",
    unitLabel: "kg",
    harvestQuantity: 12,
    reservedQuantity: 4,
    storageLossQuantity: 1,
    sownQuantity: 2,
  },
  cultivator: {
    label: "Fictional Oak household",
    mode: "household",
    choiceLabel: "Keep 4 kg for planting",
  },
  seasons: {
    harvestLabel: "Harvest season A",
    storageLabel: "Between seasons",
    plantingLabel: "Planting season B",
  },
  balanceLabels: {
    currentUse: "Current household use",
    reserved: "Seed set aside",
    storageLoss: "Recorded storage loss",
    sown: "Seed sown",
    remaining: "Seed still stored",
  },
  evidenceLabel: "Fictional quantities; no yield forecast",
  showQuantities: true,
};
