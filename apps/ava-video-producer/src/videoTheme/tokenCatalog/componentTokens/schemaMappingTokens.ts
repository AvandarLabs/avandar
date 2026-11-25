import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the schema mapping. */
export const SCHEMA_MAPPING_TOKENS = {
  fieldRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Field row radius",
    description: "Corner radius of a field row.",
  }),
  dividerWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Panel divider width",
    description: "Width of the line under a panel title.",
  }),
  dotRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Field port radius",
    description: "Radius of the dot where a mapping leaves or enters a field.",
  }),
  edgeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Mapping opacity",
    description: "Opacity of a mapping line between two fields.",
  }),
  ringRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Match ring radius",
    description: "Radius of the ring that confirms a mapping.",
  }),
  ringAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Match ring opacity",
    description: "Opacity of the confirming ring's outline.",
  }),
  ringStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Match ring width",
    description: "Width of the confirming ring's outline.",
  }),
  checkSize: ComponentTokenDefinitions.makeLengthToken({
    label: "Match check size",
    description: "Size of the check inside the confirming ring.",
  }),
} as const;
