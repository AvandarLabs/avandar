import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CapabilityCaption } from "./CapabilityCaption/CapabilityCaption";
import { CapabilityGridOptionsLayer } from "./CapabilityGridOptionsLayer/CapabilityGridOptionsLayer";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
};
/** The table panel's corner before the corner style scales it. */
const PANEL_CORNER = 8;
/** The table skeleton establishes shared row and column geometry first. */
export function CapabilityGrid({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const height = input.capabilities.length * 66;
  const panel = {
    x: 54,
    y: 176,
    width: 854,
    height,
    rx: scales.corner(PANEL_CORNER),
  };
  const caption = {
    text: input.caption,
    x: 480,
    y: 48,
    width: 840,
    fontSize: 24 as const,
    maxLines: 2,
  };
  return (
    <g>
      <CapabilityCaption {...{ frame, input, motion, caption }} />
      <CapabilityGridOptionsLayer
        {...{ frame, motion, panel, tokens, input, height }}
      />
    </g>
  );
}
