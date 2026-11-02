import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "map",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.map",
        message: "map",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "curve",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.curve",
        message: "curve",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "unknown",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.unknown",
        message: "unknown",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "selected",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.selected",
        message: "selected",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "total",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.total",
        message: "total",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.cluster-epicurve-link.controls.copy.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 44,
    },
  ],
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.copy.help",
    message:
      "All view titles, count labels and the unknown-time label. All fields required; each <= 44 characters; context must identify fictional data and schematic geography.",
  },
};
