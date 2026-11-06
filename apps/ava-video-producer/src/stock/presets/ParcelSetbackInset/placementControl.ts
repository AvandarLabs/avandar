import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for placement. */
export const PLACEMENT_CONTROL: StockControl = {
  path: "placement",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.placement",
    message: "placement",
  },
  kind: "object",
  controls: [
    {
      path: "parcelId",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.placement.parcelId",
        message: "parcelId",
      },
      kind: "select",
      optionsFrom: {
        path: "parcels",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "centerX",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.placement.centerX",
        message: "centerX",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "centerY",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.placement.centerY",
        message: "centerY",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
  ],
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.placement.help",
    message:
      "An authored placement inside the chosen parcel's inset envelope. Existing parcelId; coordinates 0..100; the whole footprint must fit the inset envelope; invalid input must not render a successful placement.",
  },
};
