import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the decision fork. */
export const DECISION_FORK_TOKENS = {
  selectedWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Chosen path width",
    description: "Width of the accent path along the chosen branch.",
  }),
  conditionRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Condition box radius",
    description: "Corner radius of a branch's condition box.",
  }),
  conditionStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Condition outline width",
    description: "Width of the accent outline on the chosen condition.",
  }),
  outcomeRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Outcome box radius",
    description: "Corner radius of a branch's outcome box.",
  }),
  outcomeStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Outcome outline width",
    description: "Width of an outcome box's outline.",
  }),
  gateWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Gate width",
    description: "Width of the cross that closes an untaken branch.",
  }),
  gateSpread: ComponentTokenDefinitions.makeLengthToken({
    label: "Gate spread",
    description: "Half the width of the cross that closes an untaken branch.",
  }),
  markerRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Marker halo radius",
    description: "Radius of the halo around the scenario marker.",
  }),
  markerAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Marker halo opacity",
    description: "Opacity of the halo around the scenario marker.",
  }),
  markerCoreRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Marker radius",
    description: "Radius of the scenario marker.",
  }),
  lineGap: ComponentTokenDefinitions.makeLengthToken({
    label: "Label line gap",
    description: "Space added between wrapped lines of a decision label.",
  }),
} as const;
