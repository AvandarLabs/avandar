import { DUR, ramp } from "../../motion";
import {
  Arrive,
  Check,
  Eyebrow,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { StaggerCardsInput } from "../presets/StaggerCards/StaggerCards.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: StaggerCardsInput };

/** Draws the bounded authored stagger-cards study at an explicit frame. */
export function StaggerCards({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const cards = input.cards;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].staggeredAssembly,
        })}
      </Eyebrow>
      <Text x={64} y={111} size={31} weight={600}>
        {input.heading}
      </Text>
      {cards.map((card, i) => {
        const x = 64 + (i % 3) * 284;
        const y = 151 + Math.floor(i / 3) * 188;
        const color = card.color === STOCK.mint ? accent : card.color;
        const done = ramp(frame, 65 + i * 12, DUR.chip);
        return (
          <Arrive key={card.label} frame={frame} at={15 + i * 4} index={i}>
            <Panel x={x} y={y} width={264} height={166}>
              <rect
                x={x + 21}
                y={y + 21}
                width={38}
                height={38}
                rx={10}
                fill={color}
                fillOpacity={0.075}
                stroke={color}
                strokeOpacity={0.28}
              />
              <path
                d={`M${x + 31} ${y + 33} h18 M${x + 31} ${y + 40} h${12 + (i % 3) * 3} M${x + 31} ${y + 47} h15`}
                stroke={color}
                strokeWidth={1.7}
                strokeLinecap="round"
              />
              <Text
                x={x + 239}
                y={y + 43}
                size={13}
                mono
                anchor="end"
                fill={STOCK.muted}
              >
                0{i + 1}
              </Text>
              <Text x={x + 22} y={y + 99} size={26} weight={600}>
                {card.label}
              </Text>
              <Text x={x + 22} y={y + 130} size={16} fill={STOCK.muted}>
                {card.detail}
              </Text>
              <circle
                cx={x + 236}
                cy={y + 128}
                r={11}
                fill={color}
                fillOpacity={done * 0.08}
                stroke={color}
                strokeOpacity={done * 0.4}
              />
              <g opacity={done}>
                {input.showChecks ? (
                  <Check x={x + 236} y={y + 128} color={color} size={9} />
                ) : null}
              </g>
            </Panel>
          </Arrive>
        );
      })}
      <Text x={64} y={554} size={13} mono fill={STOCK.muted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].conceptualCards,
        })}
      </Text>
      <Text x={896} y={554} size={13} mono fill={STOCK.muted} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["stagger-cards"].siblingsArriveInSequence,
        })}
      </Text>
    </g>
  );
}
