import { wave } from "../../motion";
import {
  CircleNode,
  Curve,
  DrawPath,
  Eyebrow,
  Packet,
  Pill,
  STOCK,
  type GraphicProps,
} from "../graphics-common";

const NETWORK_NODES = [
  { x: 480, y: 288, label: "Nexus", detail: "CENTRAL NODE" },
  { x: 235, y: 190, label: "Alpha" },
  { x: 250, y: 410, label: "Beta" },
  { x: 480, y: 118, label: "Gamma" },
  { x: 730, y: 190, label: "Delta" },
  { x: 715, y: 410, label: "Epsilon" },
  { x: 480, y: 464, label: "Zeta" },
] as const;
const NETWORK_EDGES = [
  [1, 0],
  [2, 0],
  [3, 0],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 3],
  [3, 4],
  [2, 6],
  [6, 5],
] as const;

export function NetworkGraph({ frame, accent }: GraphicProps) {
  return (
    <g>
      <Eyebrow>RELATIONSHIP NETWORK</Eyebrow>
      <Pill x={783} y={44} width={113} text="07 NODES" color={accent} />
      {NETWORK_EDGES.map(([a, b], i) => (
        <g key={i}>
          <DrawPath
            d={Curve({ from: NETWORK_NODES[a], to: NETWORK_NODES[b] })}
            frame={frame}
            at={22 + i * 2}
            color={i < 6 ? accent : STOCK.line}
            opacity={i < 6 ? 0.34 : 0.65}
          />
          <Packet
            frame={frame}
            from={NETWORK_NODES[a]}
            to={NETWORK_NODES[b]}
            delay={i * 13}
            color={i % 3 === 0 ? STOCK.cyan : accent}
            radius={i < 6 ? 4 : 2.5}
          />
        </g>
      ))}
      {NETWORK_NODES.map((node, i) => (
        <CircleNode
          key={node.label}
          {...node}
          frame={frame}
          index={i}
          accent={accent}
          radius={i === 0 ? 37 : 25}
          active={
            i === 0
              ? 0.65 + wave(frame, 90) * 0.3
              : wave(frame, 120, i * 16) * 0.5
          }
        />
      ))}
    </g>
  );
}
