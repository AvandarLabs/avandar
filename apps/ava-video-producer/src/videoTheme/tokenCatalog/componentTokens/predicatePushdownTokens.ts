import {
  createDashToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the predicate pushdown boundary. */
export const PREDICATE_PUSHDOWN_TOKENS = {
  boundaryWidth: createStrokeToken(
    "Boundary width",
    "Width of the dashed transfer boundary.",
  ),
  boundaryDash: createDashToken(
    "Boundary dash",
    "Dash pattern of the transfer boundary, in pixels.",
  ),
  predicateRadius: createLengthToken(
    "Predicate card radius",
    "Corner radius of the predicate card.",
  ),
  predicateStrokeWidth: createStrokeToken(
    "Predicate card outline width",
    "Width of the predicate card's accent outline.",
  ),
  rowRadius: createLengthToken("Row radius", "Corner radius of a data row."),
  rowStrokeWidth: createStrokeToken(
    "Row outline width",
    "Width of a data row's outline.",
  ),
  gateWidth: createStrokeToken(
    "Gate width",
    "Width of the gate that stops a row at the source.",
  ),
} as const;
