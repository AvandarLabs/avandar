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

const CARDS = [
  { label: "Source", detail: "Bring it together", color: STOCK.cyan },
  { label: "Structure", detail: "Give it a shape", color: STOCK.mint },
  { label: "Connect", detail: "Find the links", color: STOCK.orange },
  { label: "Explore", detail: "Follow the thread", color: STOCK.orange },
  { label: "Refine", detail: "Make it clearer", color: STOCK.cyan },
  { label: "Share", detail: "Put it in motion", color: STOCK.mint },
];

export function StaggerCards({ frame, accent }: GraphicProps) {
  return (
    <g>
      <Eyebrow>STAGGERED ASSEMBLY</Eyebrow>
      <Text x={64} y={111} size={31} weight={600}>
        A system, assembled.
      </Text>
      {CARDS.map((card, i) => {
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
                <Check x={x + 236} y={y + 128} color={color} size={9} />
              </g>
            </Panel>
          </Arrive>
        );
      })}
      <Text x={64} y={554} size={13} mono fill={STOCK.muted}>
        CONCEPTUAL CARDS
      </Text>
      <Text x={896} y={554} size={13} mono fill={STOCK.muted} anchor="end">
        SIBLINGS ARRIVE IN SEQUENCE
      </Text>
    </g>
  );
}
