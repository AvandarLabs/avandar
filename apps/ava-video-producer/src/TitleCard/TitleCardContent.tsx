import { AbsoluteFill } from "remotion";
import { TITLE_LEN } from "../composition-timing";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoTokens } from "../videoTheme/videoThemeHelpers";
import { TitleCardKicker } from "./TitleCardKicker";
import { TitleCardRule } from "./TitleCardRule";
import { type TitleCardProps as Props } from "./TitleCardShared/TitleCardShared.types";
import { TitleCardWords } from "./TitleCardWords";
import type { ReactNode } from "react";

function _getCardOpacity({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
}>): number {
  // The card fades out over the reveal, ending on the card's last frame.
  const fadeOut = motion.reveal;
  // The whole card leaves together, onto the same dark field the app
  // arrives on, so the handover is a dissolve between two states of one
  // ground rather than a cut between two lit frames. This is also what
  // makes the loop seam free: the card and the app composition both end on
  // this same dark ground, so there is no luminance jump at the cut.
  return (
    1 -
    motion.ramp(
      frame,
      TITLE_LEN - fadeOut.duration,
      fadeOut.duration,
      fadeOut.easing,
    )
  );
}
/**
 * Composes the title, kicker, accent rule, and fading ground for `TitleCard`.
 */
export function TitleCardContent({ name, kicker, frame }: Props): ReactNode {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const out = _getCardOpacity({ frame, motion });
  // One accent, and it is a rule rather than a second colour on the
  // letterforms. scaleX so it grows without relayout. Never a gradient across
  // the type.
  // The kicker follows the name: two type elements arriving together have no
  // hierarchy. The kicker role's alpha, not a second grey token.
  return (
    <AbsoluteFill
      style={{
        background: tokens.color.scene.ground,
        fontFamily: tokens.text.stage.title.fontFamily,
        alignItems: "center",
        justifyContent: "center",
        opacity: out,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TitleCardWords name={name} frame={frame} />

        <TitleCardRule frame={frame} />

        <TitleCardKicker kicker={kicker} frame={frame} />
      </div>
    </AbsoluteFill>
  );
}
