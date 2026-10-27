import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for rateBase. */
export const RATE_BASE_CONTROL: StockControl = {
  path: "rateBase",
  label: {
    id: "motionAtlas.population-normalized-map.controls.rateBase",
    message: "rateBase",
  },
  kind: "select",
  options: [
    {
      value: 1,
      label: {
        id: "motionAtlas.population-normalized-map.controls.rateBase.1",
        message: "1",
      },
    },
    {
      value: 10,
      label: {
        id: "motionAtlas.population-normalized-map.controls.rateBase.10",
        message: "10",
      },
    },
    {
      value: 100,
      label: {
        id: "motionAtlas.population-normalized-map.controls.rateBase.100",
        message: "100",
      },
    },
    {
      value: 1000,
      label: {
        id: "motionAtlas.population-normalized-map.controls.rateBase.1000",
        message: "1000",
      },
    },
  ],
  help: {
    id: "motionAtlas.population-normalized-map.controls.rateBase.help",
    message:
      "The population base used for records/population multiplied by this value. 1, 10, 100 or 1000; use the same base for every zone.",
  },
};
