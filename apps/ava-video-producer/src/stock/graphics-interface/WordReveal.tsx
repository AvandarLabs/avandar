import { DUR, EASE, mix, ramp } from "../../motion";
import { Eyebrow, STOCK, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { WordRevealInput } from "../presets/WordReveal/WordReveal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: WordRevealInput };

/** Draws the bounded authored word-reveal study at an explicit frame. */
export function WordReveal({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const words = input.words.map((word, index) => ({
    ...word,
    ...[
      { x: 76, y: 263, size: 91, width: 232, at: 15 },
      { x: 329, y: 263, size: 91, width: 236, at: 23 },
      { x: 72, y: 417, size: 137, width: 414, at: 36 },
    ][index],
  }));
  return (
    <g>
      <defs>
        {words.map((word, i) => (
          <clipPath id={`${id}-word-${i}`} key={word.word}>
            <rect
              x={word.x - 2}
              y={word.y - word.size}
              width={word.width}
              height={word.size + 8}
            />
          </clipPath>
        ))}
      </defs>
      <Eyebrow x={80}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["word-reveal"].maskedWordReveal,
        })}
      </Eyebrow>
      {words.map((word, i) => (
        <g key={word.word} clipPath={`url(#${id}-word-${i})`}>
          <g
            transform={`translate(0 ${mix(ramp(frame, word.at, DUR.word, EASE.word), word.size * 1.12, 0)})`}
          >
            <Text
              x={word.x}
              y={word.y}
              size={word.size}
              fill={word.accented ? accent : STOCK.text}
              weight={600}
            >
              {word.word}
            </Text>
          </g>
        </g>
      ))}
      {input.showArrow ? (
        <g opacity={ramp(frame, 51, DUR.sheet)}>
          <path
            d="M691 189 H827 V325 M826 189 L667 349"
            fill="none"
            stroke={accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={667} cy={349} r={5} fill={accent} />
          <path
            d="M666 189 V136 M666 189 H613"
            stroke={STOCK.line}
            strokeWidth={1.5}
          />
        </g>
      ) : null}
      <rect
        x={80}
        y={452}
        width={745 * ramp(frame, 62, DUR.hero)}
        height={2}
        fill={STOCK.line}
      />
      <g opacity={ramp(frame, 73, DUR.sheet)}>
        <Text x={80} y={506} size={18} fill={STOCK.muted}>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"]
                .kineticTypographyOneWordAtATime,
          })}
        </Text>
        <Text x={80} y={550} size={12} fill={STOCK.muted} mono>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["word-reveal"].translationMaskFixedTypeSize,
          })}
        </Text>
      </g>
    </g>
  );
}
