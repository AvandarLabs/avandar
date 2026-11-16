import {
  createAlphaToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the schema mapping. */
export const SCHEMA_MAPPING_TOKENS = {
  fieldRadius: createLengthToken(
    "Field row radius",
    "Corner radius of a field row.",
  ),
  dividerWidth: createStrokeToken(
    "Panel divider width",
    "Width of the line under a panel title.",
  ),
  dotRadius: createLengthToken(
    "Field port radius",
    "Radius of the dot where a mapping leaves or enters a field.",
  ),
  edgeAlpha: createAlphaToken(
    "Mapping opacity",
    "Opacity of a mapping line between two fields.",
  ),
  ringRadius: createLengthToken(
    "Match ring radius",
    "Radius of the ring that confirms a mapping.",
  ),
  ringAlpha: createAlphaToken(
    "Match ring opacity",
    "Opacity of the confirming ring's outline.",
  ),
  ringStrokeWidth: createStrokeToken(
    "Match ring width",
    "Width of the confirming ring's outline.",
  ),
  checkSize: createLengthToken(
    "Match check size",
    "Size of the check inside the confirming ring.",
  ),
} as const;
