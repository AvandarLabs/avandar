import { wave } from "../../motion";
import {
  Arrive,
  CircleNode,
  Curve,
  DrawPath,
  Eyebrow,
  Packet,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const RADIAL_LABELS = [
  "Input",
  "Parse",
  "Match",
  "Model",
  "Store",
  "Query",
  "Route",
  "Sync",
];

export function RadialNetwork({ frame, accent }: GraphicProps) {
  const center = { x: 480, y: 295 };
  const nodes = RADIAL_LABELS.map((label, i) => ({
    label,
    x: center.x + Math.cos(-Math.PI / 2 + (i * Math.PI) / 4) * 278,
    y: center.y + Math.sin(-Math.PI / 2 + (i * Math.PI) / 4) * 181,
  }));
  return (
    <g>
      <Eyebrow x={64}>HUB &amp; SPOKE</Eyebrow>
      <ellipse
        cx={480}
        cy={295}
        rx={278}
        ry={181}
        fill="none"
        stroke={STOCK.line}
        strokeDasharray="3 9"
        opacity={0.65}
      />
      {nodes.map((node, i) => (
        <g key={node.label}>
          <DrawPath
            d={Curve({ from: center, to: node })}
            frame={frame}
            at={20 + i * 2}
            color={accent}
            opacity={0.3}
          />
          <Packet
            frame={frame}
            from={i % 2 ? center : node}
            to={i % 2 ? node : center}
            delay={i * 12}
            color={i % 2 ? accent : STOCK.cyan}
          />
          <CircleNode
            {...node}
            frame={frame}
            index={i}
            accent={i % 2 ? accent : STOCK.cyan}
            radius={22}
            active={wave(frame, 90, i * 10) * 0.6}
          />
        </g>
      ))}
      <Arrive frame={frame}>
        <circle
          cx={480}
          cy={295}
          r={70}
          fill={STOCK.surface}
          stroke={accent}
          strokeOpacity={0.4}
        />
        <circle cx={480} cy={295} r={59} fill={accent} fillOpacity={0.035} />
        <Text x={480} y={293} size={25} anchor="middle" weight={600}>
          Connect
        </Text>
        <Text x={480} y={317} size={12} anchor="middle" fill={STOCK.muted} mono>
          ONE SYSTEM
        </Text>
      </Arrive>
      <Text x={480} y={560} size={15} fill={STOCK.muted} anchor="middle">
        Many endpoints. One shared center.
      </Text>
    </g>
  );
}
