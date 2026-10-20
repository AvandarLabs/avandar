import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for rateBase. */
export const RATE_BASE_CONTROL: StockControl = {
  path: "rateBase",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.rateBase",
    message: "rateBase",
  },
  kind: "select",
  options: [
    {
      value: 1,
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.rateBase.1",
        message: "1",
      },
    },
    {
      value: 10,
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.rateBase.10",
        message: "10",
      },
    },
    {
      value: 100,
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.rateBase.100",
        message: "100",
      },
    },
    {
      value: 1000,
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.rateBase.1000",
        message: "1000",
      },
    },
  ],
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.rateBase.help",
    message:
      "The common multiplier for population-normalized summaries. 1, 10, 100 or 1000; ignored for count display.",
  },
};
