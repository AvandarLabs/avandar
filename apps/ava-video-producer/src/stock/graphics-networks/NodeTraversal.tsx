import { DUR, EASE, mix, ramp } from "../../motion";
import {
  CircleNode,
  DrawPath,
  Eyebrow,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const TRAVERSAL_NODES = [
  { x: 136, y: 302, label: "A", detail: "START" },
  { x: 310, y: 170, label: "B" },
  { x: 310, y: 424, label: "C" },
  { x: 502, y: 302, label: "D" },
  { x: 680, y: 170, label: "E" },
  { x: 680, y: 424, label: "F" },
  { x: 842, y: 302, label: "G", detail: "FINISH" },
] as const;
const TRAVERSAL_EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [3, 5],
  [4, 6],
  [5, 6],
] as const;
const ROUTE = [0, 2, 3, 4, 6] as const;

export function NodeTraversal({ frame, accent }: GraphicProps) {
  const progress = ramp(frame, 24, 106, EASE.inOut) * 4;
  return (
    <g>
      <Eyebrow>DIRECTED TRAVERSAL</Eyebrow>
      <Pill
        x={744}
        y={44}
        width={152}
        text="A → C → D → E → G"
        color={accent}
      />
      {TRAVERSAL_EDGES.map(([a, b], i) => (
        <DrawPath
          key={i}
          d={`M${TRAVERSAL_NODES[a].x} ${TRAVERSAL_NODES[a].y} L${TRAVERSAL_NODES[b].x} ${TRAVERSAL_NODES[b].y}`}
          frame={frame}
          at={14 + i * 2}
          width={2}
        />
      ))}
      {ROUTE.slice(0, -1).map((a, i) => {
        const b = ROUTE[i + 1];
        const t = Math.min(1, Math.max(0, progress - i));
        return (
          <line
            key={i}
            x1={TRAVERSAL_NODES[a].x}
            y1={TRAVERSAL_NODES[a].y}
            x2={mix(t, TRAVERSAL_NODES[a].x, TRAVERSAL_NODES[b].x)}
            y2={mix(t, TRAVERSAL_NODES[a].y, TRAVERSAL_NODES[b].y)}
            stroke={accent}
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={ramp(frame, 25, DUR.chip)}
          />
        );
      })}
      {TRAVERSAL_NODES.map((node, i) => {
        const routeIndex = ROUTE.indexOf(i as (typeof ROUTE)[number]);
        const active =
          routeIndex < 0
            ? 0
            : Math.min(1, Math.max(0, progress - routeIndex + 1));
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={frame}
            index={i}
            accent={routeIndex < 0 ? STOCK.muted : accent}
            active={active}
            radius={29}
          />
        );
      })}
      <g opacity={ramp(frame, 80, DUR.sheet)}>
        <Text x={480} y={545} size={17} anchor="middle" fill={STOCK.muted}>
          A selected path through a connected system
        </Text>
      </g>
    </g>
  );
}
