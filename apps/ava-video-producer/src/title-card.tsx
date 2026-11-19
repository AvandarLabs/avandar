import { AbsoluteFill } from "remotion";
import { TITLE_LEN } from "./composition-timing";
import { mix } from "./motion";
import {
  getStageTextStyle,
  type StageTextField,
} from "./scenes/stageTheme/stageTheme";
import { StageThemeBoundary } from "./scenes/stageTheme/StageThemeBoundary";
import { useVideoMotion } from "./videoTheme/useVideoMotion";
import { useVideoShapeScales } from "./videoTheme/useVideoShapeScales";
import { useVideoTheme, useVideoTokens } from "./videoTheme/useVideoTheme";
import type { ReactNode } from "react";

export { TITLE_LEN } from "./composition-timing";

const WORD_IN = 6;
const KICKER_IN = 22;
const RULE_IN = 26;
/** How far the kicker rises as it arrives, in pixels. */
const KICKER_RISE = 10;
/** The title words take their face and colour from the card. */
const WORD_FIELDS: readonly StageTextField[] = [
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "color",
];

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
export function TitleCard(props: TitleCardProps): ReactNode {
  return (
    <StageThemeBoundary>
      <TitleCardContent {...props} />
    </StageThemeBoundary>
  );
}

type TitleCardProps = {
  name: string;
  kicker: string;
  frame: number;
};

function TitleCardContent({ name, kicker, frame }: TitleCardProps): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const titleRole = tokens.text.stage.title;
  const kickerRole = tokens.text.stage.kicker;
  const words = name.split(" ");
  // The card fades out over the reveal, ending on the card's last frame.
  const fadeOut = motion.reveal;
  const kickerIn = motion.ramp(
    frame,
    KICKER_IN,
    motion.sheet,
    motion.entrance.easing,
  );

  // The whole card leaves together, onto the same dark field the app
  // arrives on, so the handover is a dissolve between two states of one
  // ground rather than a cut between two lit frames. This is also what
  // makes the loop seam free: the card and the app composition both end on
  // this same dark ground, so there is no luminance jump at the cut.
  const out =
    1 -
    motion.ramp(
      frame,
      TITLE_LEN - fadeOut.duration,
      fadeOut.duration,
      fadeOut.easing,
    );

  return (
    <AbsoluteFill
      style={{
        background: tokens.color.scene.ground,
        fontFamily: titleRole.fontFamily,
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
        <div style={{ display: "flex", gap: spacing["22"] }}>
          {words.map((word, i) => {
            const t = motion.ramp(
              frame,
              WORD_IN + i * motion.rise.stagger,
              motion.rise.duration,
              motion.rise.easing,
            );
            return (
              // One mask per word, never one mask around several lines. The
              // word travels out from behind a hard edge; a word that
              // merely fades up reads as a slide transition, not as
              // typography.
              <span
                key={`${word}-${i}`}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  lineHeight: titleRole.lineHeight,
                  paddingBottom: spacing["6"],
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    // Negative tracking is what makes a title look set
                    // rather than typed. At 92px, default tracking reads
                    // loose and webby.
                    ...getStageTextStyle(titleRole, WORD_FIELDS),
                    // translateY only. Scaling a headline is the one thing
                    // that must never happen here: it bites hardest on a
                    // title, where type is the whole frame.
                    transform: `translateY(${mix(t, 110, 0).toFixed(2)}%)`,
                    // No opacity here, on purpose. Masking and fading at
                    // the same time cancel out: the fade makes the word
                    // visible above the edge it is supposed to be emerging
                    // from, and what reads is a slide transition again. The
                    // mask alone is the effect.
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>

        {/* One accent, and it is a rule rather than a second colour on the
            letterforms. scaleX so it grows without relayout. Never a
            gradient across the type. */}
        <div
          style={{
            width: 120,
            height: 3,
            borderRadius: scales.corner(tokens.corner.pill),
            marginTop: spacing["26"],
            background: tokens.color.scene.brand,
            transformOrigin: "center",
            transform: `scaleX(${motion
              .ramp(frame, RULE_IN, motion.sheet, motion.entrance.easing)
              .toFixed(3)})`,
          }}
        />

        {/* The kicker follows the name: two type elements arriving
            together have no hierarchy. The kicker role's alpha, not a
            second grey token. */}
        <div
          style={{
            marginTop: spacing["22"],
            ...getStageTextStyle(kickerRole),
            opacity: kickerIn,
            transform: `translateY(${mix(kickerIn, KICKER_RISE, 0).toFixed(2)}px)`,
          }}
        >
          {kicker}
        </div>
      </div>
    </AbsoluteFill>
  );
}
