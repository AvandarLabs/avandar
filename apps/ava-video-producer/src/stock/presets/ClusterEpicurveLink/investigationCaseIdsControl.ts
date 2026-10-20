import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for investigationCaseIds. */
export const INVESTIGATION_CASE_IDS_CONTROL: StockControl = {
  path: "investigationCaseIds",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.investigationCaseIds",
    message: "investigationCaseIds",
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
        id: "motionAtlas.cluster-epicurve-link.controls.investigationCaseIds.item",
        message: "Investigation case",
      },
      kind: "select",
      optionsFrom: {
        path: "cases",
        valueKey: "id",
        labelKey: "label",
      },
    },
  ],
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.investigationCaseIds.help",
    message:
      "The explicitly authored investigation group, not a detected statistical cluster. 1..8 unique IDs, all present in cases.",
  },
};
