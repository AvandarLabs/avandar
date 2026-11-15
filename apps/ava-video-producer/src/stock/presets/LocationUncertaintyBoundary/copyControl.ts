import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.location-uncertainty-boundary.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "nominal",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.nominal",
        message: "nominal",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "possible",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.possible",
        message: "possible",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "definite",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.definite",
        message: "definite",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unresolved",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.unresolved",
        message: "unresolved",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "total",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.total",
        message: "total",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.location-uncertainty-boundary.controls.copy.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.location-uncertainty-boundary.controls.copy.help",
    message:
      "Visible uncertainty, assignment and denominator labels. All fields required; each <= 40 characters; context identifies fictional schematic bounds.",
  },
};
