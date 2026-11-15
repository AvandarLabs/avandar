import {
  createAlphaToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the decision fork. */
export const DECISION_FORK_TOKENS = {
  selectedWidth: createStrokeToken(
    "Chosen path width",
    "Width of the accent path along the chosen branch.",
  ),
  conditionRadius: createLengthToken(
    "Condition box radius",
    "Corner radius of a branch's condition box.",
  ),
  conditionStrokeWidth: createStrokeToken(
    "Condition outline width",
    "Width of the accent outline on the chosen condition.",
  ),
  outcomeRadius: createLengthToken(
    "Outcome box radius",
    "Corner radius of a branch's outcome box.",
  ),
  outcomeStrokeWidth: createStrokeToken(
    "Outcome outline width",
    "Width of an outcome box's outline.",
  ),
  gateWidth: createStrokeToken(
    "Gate width",
    "Width of the cross that closes an untaken branch.",
  ),
  gateSpread: createLengthToken(
    "Gate spread",
    "Half the width of the cross that closes an untaken branch.",
  ),
  markerRadius: createLengthToken(
    "Marker halo radius",
    "Radius of the halo around the scenario marker.",
  ),
  markerAlpha: createAlphaToken(
    "Marker halo opacity",
    "Opacity of the halo around the scenario marker.",
  ),
  markerCoreRadius: createLengthToken(
    "Marker radius",
    "Radius of the scenario marker.",
  ),
  lineGap: createLengthToken(
    "Label line gap",
    "Space added between wrapped lines of a decision label.",
  ),
} as const;
