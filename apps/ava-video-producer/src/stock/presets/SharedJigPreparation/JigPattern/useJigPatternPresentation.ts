import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SharedJigPreparation.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  x: number;
  y: number;
  pattern: Input["guide"]["pattern"];
  progress?: number;
  isGuide?: boolean;
  color: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  x: Options["x"];
  y: Options["y"];
  pattern: Options["pattern"];
  progress: number;
  isGuide: boolean;
  color: Options["color"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  radius: number;
  body: string;
  holes: string;
  notch: string;
};

/**
 * Returns pattern body, holes, notch, and theme values for `JigCutout`,
 * `JigPattern`.
 */
export function useJigPatternPresentation({
  x,
  y,
  pattern,
  progress = 1,
  isGuide = false,
  color,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const radius = 7 * progress;
  const body = `M${x} ${y} h100 v64 h-100 Z`;
  const holes = [30, 70]
    .map((offset) => {
      return `M${x + offset - radius} ${y + 32} a${radius} ${radius} 0 1 0 ${radius * 2} 0 a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
    })
    .join(" ");
  const notch = `M${x} ${y} h${22 * progress} v${22 * progress} h${-22 * progress} Z`;
  return {
    x,
    y,
    pattern,
    progress,
    isGuide,
    color,
    tokens,
    scales,
    radius,
    body,
    holes,
    notch,
  };
}
