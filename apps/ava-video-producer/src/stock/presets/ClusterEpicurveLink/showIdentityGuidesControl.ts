import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showIdentityGuides. */
export const SHOW_IDENTITY_GUIDES_CONTROL: StockControl = {
  path: "showIdentityGuides",
  label: {
    id: "motionAtlas.cluster-epicurve-link.controls.showIdentityGuides",
    message: "showIdentityGuides",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.cluster-epicurve-link.controls.showIdentityGuides.help",
    message:
      "Show temporary guides between the two representations of a case. Boolean; guides connect a case to its histogram position only, never case to case.",
  },
};
