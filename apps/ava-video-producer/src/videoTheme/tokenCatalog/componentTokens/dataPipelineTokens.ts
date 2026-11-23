import { ComponentTokenDefinitions } from "./ComponentTokenDefinitions";
/** Tokens of the data pipeline. */
export const DATA_PIPELINE_TOKENS = {
  activeTintAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Active stage tint",
    description: "Opacity of the accent tint on a completed stage.",
  }),
  activeStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Active stage outline",
    description: "Opacity of the accent outline on a completed stage.",
  }),
  activeStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Active stage outline width",
    description: "Width of the accent outline on a completed stage.",
  }),
  iconRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Stage icon radius",
    description: "Radius of the disc behind a stage's check.",
  }),
  iconFillAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Stage icon fill",
    description: "Opacity of the disc behind a stage's check.",
  }),
  iconStrokeAlpha: ComponentTokenDefinitions.makeAlphaToken({
    label: "Stage icon rim",
    description: "Opacity of the rim of the disc behind a stage's check.",
  }),
  iconStrokeWidth: ComponentTokenDefinitions.makeStrokeToken({
    label: "Stage icon rim width",
    description: "Width of the rim of the disc behind a stage's check.",
  }),
  checkSize: ComponentTokenDefinitions.makeLengthToken({
    label: "Stage check size",
    description: "Size of the check on a completed stage.",
  }),
  dotRadius: ComponentTokenDefinitions.makeLengthToken({
    label: "Stage dot radius",
    description: "Radius of the dot on a stage that has not finished.",
  }),
  trackHeight: ComponentTokenDefinitions.makeLengthToken({
    label: "Progress track height",
    description: "Thickness of the pipeline's progress track.",
  }),
  packetPeriod: ComponentTokenDefinitions.makeDurationToken({
    label: "Pipeline packet period",
    description: "Frames for a packet to cross between two stages.",
  }),
} as const;
