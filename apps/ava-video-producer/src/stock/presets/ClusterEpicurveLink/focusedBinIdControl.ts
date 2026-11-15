import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for focusedBinId. */
export const FOCUSED_BIN_ID_CONTROL: StockControl = {
  path: "focusedBinId",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.focusedBinId",
    message: "focusedBinId",
  },
  nullable: true,
  kind: "select",
  optionsFrom: {
    path: "timeBins",
    valueKey: "id",
    labelKey: "label",
  },
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.focusedBinId.help",
    message:
      "Time bin whose cases receive the return highlight on the map. Existing time-bin ID or null to omit the return highlight.",
  },
};
