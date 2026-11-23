import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PracticeToWorkSample.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  isMeasuring: boolean;
  isApplication: boolean;
  x: number;
  origin: number;
  rulerY: number;
  pencilX: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  isMeasuring: Options["isMeasuring"];
  isApplication: Options["isApplication"];
  x: Options["x"];
  origin: Options["origin"];
  rulerY: Options["rulerY"];
  pencilX: Options["pencilX"];
  accent: Options["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns ruler, pencil, and application state with theme values for
 * `RulerHand`, `MeasuringTools`, `PencilHand`.
 */
export function useMeasuringToolsPresentation({
  input,
  isMeasuring,
  isApplication,
  x,
  origin,
  rulerY,
  pencilX,
  accent,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return {
    input,
    isMeasuring,
    isApplication,
    x,
    origin,
    rulerY,
    pencilX,
    accent,
    atomic,
    tokens,
    scales,
  };
}
