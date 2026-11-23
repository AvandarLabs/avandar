import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReportPageGeometryFromInputAndFrame } from "../getReportPageGeometryFromInputAndFrame";
import type { Input } from "../ReportPageBind.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  section: Input["sections"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  section: Options["section"];
  index: Options["index"];
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  y: number;
  margins: number;
};

/** Returns page position, margins, and theme values for `ReportPage`. */
export function useReportPagePresentation({
  section,
  index,
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, margins } = getReportPageGeometryFromInputAndFrame({
    motion,
    input,
    frame,
    index,
  });
  return {
    section,
    index,
    frame,
    input,
    accent,
    tokens,
    motion,
    scales,
    x,
    y,
    margins,
  };
}
