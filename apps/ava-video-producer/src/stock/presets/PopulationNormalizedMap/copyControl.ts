import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.population-normalized-map.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "countLegend",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.countLegend",
        message: "countLegend",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "normalizedLegend",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.normalizedLegend",
        message: "normalizedLegend",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "records",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.records",
        message: "records",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "population",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.population",
        message: "population",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "per",
      label: {
        id: "motionAtlas.population-normalized-map.controls.copy.per",
        message: "per",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.population-normalized-map.controls.copy.help",
    message:
      "Visible measure names, geography qualifier and fraction labels. All fields required; each <= 40 characters; normalized legend must make the changed measure explicit.",
  },
};
