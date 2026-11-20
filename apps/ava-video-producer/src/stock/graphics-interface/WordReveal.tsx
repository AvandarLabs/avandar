import { mix } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { WordRevealInput } from "../presets/WordReveal/WordReveal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: WordRevealInput };
const ARROW_AT = 51;
const RULE_AT = 62;
const NOTES_AT = 73;
/** How far below its mask a word starts, in multiples of its size. */
const WORD_DROP = 1.12;
/** Draws the bounded authored word-reveal study at an explicit frame. */
export function WordReveal({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const words = input.words.map((word, index) => {
    return {
      ...word,
      ...[
        { x: 76, y: 263, size: 91, width: 232, at: 15 },
        { x: 329, y: 263, size: 91, width: 236, at: 23 },
        { x: 72, y: 417, size: 137, width: 414, at: 36 },
      ][index],
    };
  });
  return (
    <g>
      <defs>
        {words.map((word, i) => {
          return (
            <clipPath id={`${id}-word-${i}`} key={word.word}>
              <rect
                x={word.x - 2}
                y={word.y - word.size}
                width={word.width}
                height={word.size + 8}
              />
            </clipPath>
          );
        })}
      </defs>
      <Eyebrow x={80}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["word-reveal"].maskedWordReveal,
        })}
      </Eyebrow>
      {words.map((word, i) => {
        return (
          <g key={word.word} clipPath={`url(#${id}-word-${i})`}>
            <g
              transform={`translate(0 ${mix(motion.ramp(frame, word.at, motion.rise.duration, motion.rise.easing), word.size * WORD_DROP, 0)})`}
            >
              <Text
                role="title"
                x={word.x}
                y={word.y}
                fittedSize={word.size}
                fill={word.accented ? accent : color.text}
              >
                {word.word}
              </Text>
            </g>
          </g>
        );
      })}
      {input.showArrow ? (
        <g opacity={motion.ramp(frame, ARROW_AT, motion.sheet)}>
          <SketchedShape
            shape={{ kind: "path", d: "M691 189 H827 V325 M826 189 L667 349" }}
            profile={sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={shapes.stroke(stroke.emphasis)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={667} cy={349} r={5} fill={accent} />
          <SketchedShape
            shape={{ kind: "path", d: "M666 189 V136 M666 189 H613" }}
            profile={sketch.shape}
            stroke={color.line}
            strokeWidth={shapes.stroke(stroke.guide)}
          />
        </g>
      ) : null}
      <rect
        x={80}
        y={452}
        width={745 * motion.ramp(frame, RULE_AT, motion.hero)}
        height={2}
        fill={color.line}
      />
      <g opacity={motion.ramp(frame, NOTES_AT, motion.sheet)}>
        <Text role="label" x={80} y={506} fill={color.textMuted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"]
                .kineticTypographyOneWordAtATime,
          })}
        </Text>
        <Text role="detail" x={80} y={550}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"].translationMaskFixedTypeSize,
          })}
        </Text>
      </g>
    </g>
  );
}
