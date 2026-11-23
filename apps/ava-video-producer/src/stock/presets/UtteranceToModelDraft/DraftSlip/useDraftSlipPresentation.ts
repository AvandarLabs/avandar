import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPhrasePositionsFromSentenceParts } from "../getPhrasePositionsFromSentenceParts";
import type { Input } from "../UtteranceToModelDraft.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  frame: number;
  input: Input;
  accent: string;
  item: Input["draft"]["entities"][number];
  index: number;
  x: number;
  y: number;
  role: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  item: Options["item"];
  x: Options["x"];
  y: Options["y"];
  role: Options["role"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  source: ReturnType<typeof getPhrasePositionsFromSentenceParts>[number];
  duration: number;
  start: number;
};

/**
 * Returns source phrase, travel timing, and theme values for a draft slip for
 * `DraftSlip`, `DraftSourceGuide`.
 */
export function useDraftSlipPresentation({
  frame,
  input,
  accent,
  item,
  index,
  x,
  y,
  role,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const source = getPhrasePositionsFromSentenceParts(input.sentenceParts).find(
    propEq("id", item.partId),
  )!;
  const duration = 48 / (3 + input.draft.attributes.length);
  const start = 49 + index * duration;
  return {
    frame,
    input,
    accent,
    item,
    x,
    y,
    role,
    atomic,
    tokens,
    motion,
    source,
    duration,
    start,
  };
}
