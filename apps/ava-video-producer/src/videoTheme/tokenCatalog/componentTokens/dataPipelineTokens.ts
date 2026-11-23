import {
  createAlphaToken,
  createDurationToken,
  createLengthToken,
  createStrokeToken,
} from "./componentTokenHelpers";

/** Tokens of the data pipeline. */
export const DATA_PIPELINE_TOKENS = {
  activeTintAlpha: createAlphaToken(
    "Active stage tint",
    "Opacity of the accent tint on a completed stage.",
  ),
  activeStrokeAlpha: createAlphaToken(
    "Active stage outline",
    "Opacity of the accent outline on a completed stage.",
  ),
  activeStrokeWidth: createStrokeToken(
    "Active stage outline width",
    "Width of the accent outline on a completed stage.",
  ),
  iconRadius: createLengthToken(
    "Stage icon radius",
    "Radius of the disc behind a stage's check.",
  ),
  iconFillAlpha: createAlphaToken(
    "Stage icon fill",
    "Opacity of the disc behind a stage's check.",
  ),
  iconStrokeAlpha: createAlphaToken(
    "Stage icon rim",
    "Opacity of the rim of the disc behind a stage's check.",
  ),
  iconStrokeWidth: createStrokeToken(
    "Stage icon rim width",
    "Width of the rim of the disc behind a stage's check.",
  ),
  checkSize: createLengthToken(
    "Stage check size",
    "Size of the check on a completed stage.",
  ),
  dotRadius: createLengthToken(
    "Stage dot radius",
    "Radius of the dot on a stage that has not finished.",
  ),
  trackHeight: createLengthToken(
    "Progress track height",
    "Thickness of the pipeline's progress track.",
  ),
  packetPeriod: createDurationToken(
    "Pipeline packet period",
    "Frames for a packet to cross between two stages.",
  ),
} as const;
