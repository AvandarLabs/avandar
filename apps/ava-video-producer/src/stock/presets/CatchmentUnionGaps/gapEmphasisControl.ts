import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for gapEmphasis. */
export const GAP_EMPHASIS_CONTROL: StockControl = {
  path: "gapEmphasis",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.gapEmphasis",
    message: "gapEmphasis",
  },
  kind: "select",
  options: [
    {
      value: "outline",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.gapEmphasis.outline",
        message: "outline",
      },
    },
    {
      value: "hatch",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.gapEmphasis.hatch",
        message: "hatch",
      },
    },
  ],
  help: {
    id: "motionAtlas.catchment-union-gaps.controls.gapEmphasis.help",
    message:
      "How uncovered household markers receive final emphasis. One listed value; do not shade unsupplied populations as known gaps.",
  },
};
