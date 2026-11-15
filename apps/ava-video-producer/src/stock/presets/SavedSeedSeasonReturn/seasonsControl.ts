import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for seasons. */
export const SEASONS_CONTROL: StockControl = {
  path: "seasons",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.seasons",
    message: "seasons",
  },
  kind: "object",
  controls: [
    {
      path: "harvestLabel",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.seasons.harvestLabel",
        message: "harvestLabel",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "storageLabel",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.seasons.storageLabel",
        message: "storageLabel",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "plantingLabel",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.seasons.plantingLabel",
        message: "plantingLabel",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
  ],
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.seasons.help",
    message:
      "Labels the three temporal settings while the same plot and seed jar remain identifiable. These labels indicate order, not measured elapsed duration. three required labels, each 1..28 characters; no inferred dates, climate, or season length",
  },
};
