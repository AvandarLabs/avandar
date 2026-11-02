import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for measure. */
export const MEASURE_CONTROL: StockControl = {
  path: "measure",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.measure",
    message: "measure",
  },
  kind: "select",
  options: [
    {
      value: "count",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.measure.count",
        message: "count",
      },
    },
    {
      value: "normalized",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.measure.normalized",
        message: "normalized",
      },
    },
  ],
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.measure.help",
    message:
      "Display summed counts or the ratio of summed counts to summed populations. One listed value; never average precomputed cell rates.",
  },
};
