import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for selectedSiteIds. */
export const SELECTED_SITE_IDS_CONTROL: StockControl = {
  path: "selectedSiteIds",
  label: {
    id: "motionAtlas.stratified-spatial-sample.controls.selectedSiteIds",
    message: "selectedSiteIds",
  },
  kind: "collection",
  minItems: 1,
  maxItems: 8,
  itemSchema: {
    type: "string",
    maxLength: 12,
  },
  itemControls: [
    {
      path: "",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.selectedSiteIds.item",
        message: "Selected site",
      },
      kind: "select",
      optionsFrom: {
        path: "sites",
        valueKey: "id",
        labelKey: "label",
      },
    },
  ],
  help: {
    id: "motionAtlas.stratified-spatial-sample.controls.selectedSiteIds.help",
    message:
      "Explicit sites selected for this plan. 1..8 unique existing site IDs; selection may leave a stratum unsampled, which must remain visible.",
  },
};
