import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the predicate pushdown boundary. */
export const PREDICATE_PUSHDOWN_TOKENS = {
  boundaryWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Boundary width",
    description: "Width of the dashed transfer boundary.",
  }),
  boundaryDash: ComponentTokenDefinitions.makeDashToken({
    label: "Boundary dash",
    description: "Dash pattern of the transfer boundary, in pixels.",
  }),
  predicateRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Predicate card radius",
    description: "Corner radius of the predicate card.",
  }),
  predicateStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Predicate card outline width",
    description: "Width of the predicate card's accent outline.",
  }),
  rowRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Row radius",
    description: "Corner radius of a data row.",
  }),
  rowStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Row outline width",
    description: "Width of a data row's outline.",
  }),
  gateWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Gate width",
    description: "Width of the gate that stops a row at the source.",
  }),
} as const;
