import { loopPhase, mix, wave } from "../../motion";
import {
  Check,
  Eyebrow,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const STREAM_LANES = [
  { y: 208, label: "STREAM A", color: STOCK.cyan, offset: 0 },
  { y: 310, label: "STREAM B", color: STOCK.mint, offset: 28 },
  { y: 412, label: "STREAM C", color: STOCK.orange, offset: 59 },
] as const;

export function PacketStream({ frame, accent, id }: GraphicProps) {
  return (
    <g>
      <defs>
        <clipPath id={`${id}-stream`}>
          <rect x={230} y={155} width={554} height={305} />
        </clipPath>
      </defs>
      <Eyebrow>PACKET STREAM</Eyebrow>
      <Text x={64} y={112} size={29} weight={600}>
        Signals in motion
      </Text>
      {STREAM_LANES.map((lane, i) => {
        const color = i === 1 ? accent : lane.color;
        return (
          <g key={lane.label}>
            <Text x={64} y={lane.y + 5} size={16} mono fill={color}>
              {lane.label}
            </Text>
            <path
              d={`M230 ${lane.y} H805`}
              stroke={STOCK.line}
              strokeWidth={1.5}
            />
            <g clipPath={`url(#${id}-stream)`}>
              {[0, 1, 2, 3].map((p) => {
                const t = loopPhase(frame, 130, lane.offset + p * 32.5);
                const x = mix(t, 188, 820);
                return (
                  <g key={p} opacity={0.5 + wave(frame, 90, p * 20) * 0.5}>
                    <rect
                      x={x - 35}
                      y={lane.y - 13}
                      width={62}
                      height={26}
                      rx={6}
                      fill={color}
                      fillOpacity={0.13}
                      stroke={color}
                      strokeOpacity={0.65}
                    />
                    <path
                      d={`M${x - 21} ${lane.y} h23`}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <circle cx={x + 14} cy={lane.y} r={2.5} fill={color} />
                  </g>
                );
              })}
            </g>
            <circle
              cx={824}
              cy={lane.y}
              r={19}
              fill={STOCK.surface}
              stroke={color}
              strokeOpacity={0.4}
            />
            <Check x={824} y={lane.y} color={color} size={14} />
          </g>
        );
      })}
      <line x1={64} y1={495} x2={896} y2={495} stroke={STOCK.line} />
      <Text x={64} y={538} size={15} fill={STOCK.muted} mono>
        PRODUCE
      </Text>
      <Text x={480} y={538} size={15} fill={STOCK.muted} mono anchor="middle">
        TRANSPORT
      </Text>
      <Text x={896} y={538} size={15} fill={STOCK.muted} mono anchor="end">
        RECEIVE
      </Text>
    </g>
  );
}
