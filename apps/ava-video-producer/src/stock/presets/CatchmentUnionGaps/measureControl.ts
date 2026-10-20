import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for measure. */
export const MEASURE_CONTROL: StockControl = {
  path: "measure",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.measure",
    message: "measure",
  },
  kind: "select",
  options: [
    {
      value: "households",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.measure.households",
        message: "households",
      },
    },
    {
      value: "members",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.measure.members",
        message: "members",
      },
    },
  ],
  help: {
    id: "motionAtlas.catchment-union-gaps.controls.measure.help",
    message:
      "Choose the unit for the covered and uncovered shares. One listed value; count each household once even inside several polygons.",
  },
};
