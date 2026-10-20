import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for colorDomains. */
export const COLOR_DOMAINS_CONTROL: StockControl = {
  path: "colorDomains",
  label: {
    id: "motionAtlas.population-normalized-map.controls.colorDomains",
    message: "colorDomains",
  },
  kind: "object",
  controls: [
    {
      path: "countMaximum",
      label: {
        id: "motionAtlas.population-normalized-map.controls.colorDomains.countMaximum",
        message: "countMaximum",
      },
      kind: "number",
      min: 5e-324,
      max: 100000,
    },
    {
      path: "normalizedMaximum",
      label: {
        id: "motionAtlas.population-normalized-map.controls.colorDomains.normalizedMaximum",
        message: "normalizedMaximum",
      },
      kind: "number",
      min: 5e-324,
      max: 100000,
    },
  ],
  help: {
    id: "motionAtlas.population-normalized-map.controls.colorDomains.help",
    message:
      "Explicit zero-based color legend ranges before and after normalization. Both > 0 and <= 100000; countMaximum covers every record count; normalizedMaximum covers every derived value; no clipping.",
  },
};
