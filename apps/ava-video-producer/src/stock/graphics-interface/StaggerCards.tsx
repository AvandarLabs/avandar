import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../graphics-common/Arrive";
import { Check } from "../graphics-common/Check";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Panel } from "../graphics-common/Panel";
import { Text } from "../graphics-common/Text";
import { LEGACY_ACCENT_HEX } from "../presets/legacy/legacyAccentHex";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { StockRect } from "../primitives/StockRect/StockRect";
import { getContentColorFromValue } from "../theme/getContentColorFromValue/getContentColorFromValue";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { StaggerCardsInput } from "../presets/StaggerCards/StaggerCards.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: StaggerCardsInput };

const ARRIVE_AT = 15;
const ARRIVE_STEP = 4;
const DONE_AT = 65;
const DONE_STEP = 12;
const HEADING_SIZE = 31;
const CARD_LABEL_SIZE = 26;
const ICON_CORNER = 10;
const ICON_FILL_ALPHA = 0.075;
const ICON_STROKE_ALPHA = 0.28;
const GLYPH_STROKE = 1.7;

/** Draws the bounded authored stagger-cards study at an explicit frame. */
export function StaggerCards({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const { color, stroke, alpha, sketch } = tokens;
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const cards = input.cards;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].staggeredAssembly,
        })}
      </Eyebrow>
      <Text role="title" x={64} y={111} size={HEADING_SIZE}>
        {input.heading}
      </Text>
      {cards.map((card, i) => {
        const x = 64 + (i % 3) * 284;
        const y = 151 + Math.floor(i / 3) * 188;
        const cardColor = getContentColorFromValue(
          card.color === LEGACY_ACCENT_HEX ? "accent" : card.color,
          { tokens, accent },
        );
        const done = motion.ramp(frame, DONE_AT + i * DONE_STEP, motion.chip);
        return (
          <Arrive
            key={card.label}
            frame={frame}
            at={ARRIVE_AT + i * ARRIVE_STEP}
            index={i}
          >
            <Panel x={x} y={y} width={264} height={166}>
              <StockRect
                x={x + 21}
                y={y + 21}
                width={38}
                height={38}
                rx={shapes.corner(ICON_CORNER)}
                fill={cardColor}
                fillOpacity={shapes.wash(ICON_FILL_ALPHA)}
                stroke={cardColor}
                strokeOpacity={ICON_STROKE_ALPHA}
                strokeWidth={hairline}
              />
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${x + 31} ${y + 33} h18 M${x + 31} ${y + 40} h${12 + (i % 3) * 3} M${x + 31} ${y + 47} h15`,
                }}
                profile={sketch.shape}
                stroke={cardColor}
                strokeWidth={shapes.stroke(GLYPH_STROKE)}
                strokeLinecap="round"
              />
              <Text role="pill" x={x + 239} y={y + 43} anchor="end">
                0{i + 1}
              </Text>
              <Text role="title" x={x + 22} y={y + 99} size={CARD_LABEL_SIZE}>
                {card.label}
              </Text>
              <Text role="secondary" x={x + 22} y={y + 130}>
                {card.detail}
              </Text>
              <SketchedShape
                shape={{ kind: "circle", cx: x + 236, cy: y + 128, r: 11 }}
                profile={sketch.shape}
                fill={cardColor}
                fillOpacity={done * shapes.wash(alpha.wash)}
                stroke={cardColor}
                strokeOpacity={done * alpha.dimmed}
                strokeWidth={hairline}
              />
              <g opacity={done}>
                {input.showChecks ? (
                  <Check x={x + 236} y={y + 128} color={cardColor} size={9} />
                ) : null}
              </g>
            </Panel>
          </Arrive>
        );
      })}
      <Text role="pill" x={64} y={554}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].conceptualCards,
        })}
      </Text>
      <Text role="pill" x={896} y={554} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["stagger-cards"].siblingsArriveInSequence,
        })}
      </Text>
    </g>
  );
}
