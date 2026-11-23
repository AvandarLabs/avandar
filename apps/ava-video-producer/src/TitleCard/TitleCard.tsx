import { StageThemeBoundary } from "../scenes/StageTheme/StageThemeBoundary";
import { TitleCardContent } from "./TitleCardContent";
import { type TitleCardProps as Props } from "./TitleCardShared/TitleCardShared.types";
import type { ReactNode } from "react";

export { TITLE_LEN } from "../composition-timing";
/**
 * The cold open. Full rationale:
 * .claude/skills/product-demo/references/titles.md
 *
 * Words rise out of their own mask boxes, staggered, then the card holds
 * still long enough to be read and dissolves into the same dark ground the
 * app rises from.
 *
 * Per word, not per letter. The request is almost always "letters one by
 * one", and for a title of any length that is the wrong call: 15 glyphs at
 * a 2-frame stagger are still arriving at frame 30 of a 66-frame card, with
 * nothing left over for stillness. What the eye gets is a typewriter: a
 * mechanism, not a title. Boxing each glyph also destroys kerning, which at
 * 92px is visible on every diagonal pair. Per-letter is permitted only for
 * a four or five glyph wordmark where you can set the kerning by hand.
 *
 * Type comes from the `text.stage.title` and `text.stage.kicker` roles, the
 * ground and rule from the scene palette, and timing from `motion.rise`, so
 * the card follows the video theme (`classic` outside any provider).
 */
export function TitleCard({
  name: propsName,
  kicker: propsKicker,
  frame: propsFrame,
}: Props): ReactNode {
  return (
    <StageThemeBoundary>
      <TitleCardContent
        {...{ name: propsName, kicker: propsKicker, frame: propsFrame }}
      />
    </StageThemeBoundary>
  );
}
