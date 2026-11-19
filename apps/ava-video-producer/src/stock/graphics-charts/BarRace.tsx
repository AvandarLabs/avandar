import { mix } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { StockRect } from "../primitives/StockRect/StockRect";
import { getContentColorFromValue } from "../theme/getContentColorFromValue/getContentColorFromValue";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { BarRaceInput } from "../presets/BarRace/BarRace.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: BarRaceInput };

const RACE_AT = 52;
const RACE_FRAMES = 64;
const GROW_AT = 12;
const LABEL_RETURN_AT = 116;
const HEADING_SIZE = 29;
const BAR_LABEL_SIZE = 23;
const BAR_CORNER = 6;

/** Draws the bounded authored bar-race study at an explicit frame. */
export function BarRace({ input, frame, accent }: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const { color, stroke, alpha, sketch } = tokens;
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const bars = input.bars;
  const t = motion.ramp(
    frame,
    RACE_AT,
    motion.scale(RACE_FRAMES),
    motion.travel.easing,
  );
  const enter = motion.ramp(frame, GROW_AT, motion.hero);
  const labelOpacity =
    1 -
    motion.ramp(frame, RACE_AT, motion.chip) +
    motion.ramp(frame, LABEL_RETURN_AT, motion.panel);
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["bar-race"].rankingInMotion,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["bar-race"].fictionalData,
        })}
        color={accent}
      />
      <Text role="title" x={64} y={112} size={HEADING_SIZE}>
        {input.heading}
      </Text>
      {[0, 25, 50, 75, 100].map((value) => {
        return (
          <g key={value}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: 205 + value * 6,
                y1: 157,
                x2: 205 + value * 6,
                y2: 474,
              }}
              profile={sketch.shape}
              stroke={color.line}
              strokeOpacity={alpha.guide}
              strokeWidth={hairline}
            />
            <Text role="footnote" x={205 + value * 6} y={507} anchor="middle">
              {value}
            </Text>
          </g>
        );
      })}
      {bars.map((bar, i) => {
        const value = mix(t, bar.start, bar.end) * enter;
        const y = 175 + mix(t, bar.from, bar.to) * 77;
        const barColor =
          i === 0
            ? accent
            : getContentColorFromValue(bar.color, { tokens, accent });
        return (
          <g key={bar.label}>
            <g opacity={labelOpacity}>
              <Text x={177} y={y + 29} size={BAR_LABEL_SIZE} anchor="end">
                {bar.label}
              </Text>
            </g>
            <rect
              x={205}
              y={y}
              width={Math.max(0.01, value * 6)}
              height={43}
              rx={shapes.corner(BAR_CORNER)}
              fill={barColor}
              fillOpacity={atomic.opacity["85"]}
            />
            <StockRect
              x={205}
              y={y}
              width={Math.max(0.01, value * 6)}
              height={43}
              rx={shapes.corner(BAR_CORNER)}
              fill={barColor}
              fillOpacity={shapes.wash(alpha.tint)}
              stroke={barColor}
              strokeWidth={hairline}
            />
            <g opacity={labelOpacity}>
              <Text role="code" x={220 + value * 6} y={y + 29} fill={barColor}>
                {Math.round(value)}
              </Text>
            </g>
          </g>
        );
      })}
      {input.showLegend
        ? bars.map((bar, i) => {
            return (
              <g key={bar.label}>
                <circle
                  cx={72 + i * 216}
                  cy={546}
                  r={5}
                  fill={
                    i === 0
                      ? accent
                      : getContentColorFromValue(bar.color, { tokens, accent })
                  }
                />
                <Text role="choice" x={86 + i * 216} y={552}>
                  {bar.label}
                </Text>
              </g>
            );
          })
        : null}
      <Text role="data" x={64} y={580} fill={color.textMuted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["bar-race"].illustrativeValuesFixed0100Scale,
        })}
      </Text>
      <Text role="detail" x={896} y={580} anchor="end">
        {Math.round(mix(t, 1, 2)) === 1
          ? getStockDisplayCopyFromDescriptor({
              descriptor: LEGACY_DISPLAY_COPY["bar-race"].periodTransition,
            })
          : getStockDisplayCopyFromDescriptor({
              descriptor: LEGACY_DISPLAY_COPY["bar-race"].periodFinal,
            })}
      </Text>
    </g>
  );
}
