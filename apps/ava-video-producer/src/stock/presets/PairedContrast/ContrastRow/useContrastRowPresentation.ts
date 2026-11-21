import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PairedContrast.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  row: Input["criteria"][number];
  index: number;
  frame: number;
  accent: string;
  isFocused: boolean;
  showBrackets: boolean;
};
/** Frames between neighbouring criteria arriving. */
const ROW_STAGGER_FRAMES = 12;
function _getLabelsFromCriterion({
  row,
  y,
  color,
}: {
  row: Readonly<Input["criteria"][number]>;
  y: number;
  color: Readonly<{ text: string; textMuted: string }>;
}) {
  return [
    {
      text: row.label,
      x: 480,
      y: y - 3,
      width: 144,
      fontSize: 14 as const,
      color: color.textMuted,
    },
    ...[row.leftText, row.rightText].map((text, side) => {
      return {
        text,
        x: 224 + side * 512,
        y: y - 9,
        width: 288,
        fontSize: 18 as const,
        color: color.text,
      };
    }),
  ];
}

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  row: Options["row"];
  frame: Options["frame"];
  accent: Options["accent"];
  isFocused: Options["isFocused"];
  showBrackets: Options["showBrackets"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: number;
  stagger: number;
  entrance: number;
  labels: Array<
    | {
        text: string;
        x: number;
        y: number;
        width: number;
        fontSize: 18;
        color: string;
      }
    | {
        text: string;
        x: number;
        y: number;
        width: number;
        fontSize: 14;
        color: string;
      }
  >;
};

/**
 * Returns row position, entrance progress, stagger, and label slots for
 * `ContrastRow`.
 */
export function useContrastRowPresentation({
  row,
  index,
  frame,
  accent,
  isFocused,
  showBrackets,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 274 + index * 100;
  const stagger = index * motion.scaleStagger(ROW_STAGGER_FRAMES);
  const entrance = Motion.ramp({
    frame,
    at: 36 + stagger,
    dur: motion.hero,
    easing: motion.entrance.easing,
  });
  const labels = _getLabelsFromCriterion({ row, y, color: tokens.color });
  return {
    row,
    frame,
    accent,
    isFocused,
    showBrackets,
    tokens,
    y,
    stagger,
    entrance,
    labels,
  };
}
