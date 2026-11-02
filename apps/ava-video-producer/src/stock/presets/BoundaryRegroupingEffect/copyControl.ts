import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "total",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.copy.total",
        message: "total",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "records",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.copy.records",
        message: "records",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "population",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.copy.population",
        message: "population",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "per",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.copy.per",
        message: "per",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.copy.help",
    message:
      "Visible qualifier, unchanged-total caption and units. All fields required; each <= 40 characters; context identifies fictional schematic geography.",
  },
};
