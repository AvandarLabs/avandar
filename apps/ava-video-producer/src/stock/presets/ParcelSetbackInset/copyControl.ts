import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.parcel-setback-inset.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "parcel",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.parcel",
        message: "parcel",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "envelope",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.envelope",
        message: "envelope",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "clearance",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.clearance",
        message: "clearance",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "empty",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.empty",
        message: "empty",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.parcel-setback-inset.controls.copy.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.parcel-setback-inset.controls.copy.help",
    message:
      "Visible geometric labels and coordinate unit. All fields required; each <= 40 characters; context must identify fictional geometry rather than a planning standard.",
  },
};
