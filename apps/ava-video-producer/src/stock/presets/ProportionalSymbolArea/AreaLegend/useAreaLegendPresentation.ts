import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ProportionalSymbolArea.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  hairline: number;
  ratio: number;
  radius: number;
};

/**
 * Returns area ratio, reference radius, sketch, and motion values for
 * `AreaLegend`, `AreaReferenceComparison`.
 */
export function useAreaLegendPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const ratio = input.sites[1].value / input.sites[0].value,
    radius = Math.sqrt(input.areaPerUnit / Math.PI);
  return { input, frame, accent, sketch, motion, hairline, ratio, radius };
}
