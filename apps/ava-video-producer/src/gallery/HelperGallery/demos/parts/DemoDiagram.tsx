import { DEMO_COLORS } from "../demoTheme";

/** Node centres of the preview diagram, on the 960 by 600 Atlas canvas. */
export const DIAGRAM_NODES = [
  { id: "source", x: 150, y: 170 },
  { id: "join", x: 300, y: 220 },
  { id: "filter", x: 470, y: 150 },
  { id: "model", x: 520, y: 380 },
  { id: "chart", x: 760, y: 220 },
  { id: "share", x: 800, y: 450 },
] as const;

const EDGES = [
  ["source", "join"],
  ["join", "filter"],
  ["join", "model"],
  ["filter", "chart"],
  ["model", "share"],
  ["chart", "share"],
] as const;

const NODE = { width: 150, height: 64 };

function _findNode(id: string) {
  return DIAGRAM_NODES.find((node) => node.id === id)!;
}

/** One labelled node of the preview diagram. */
function DiagramNode({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x - NODE.width / 2} ${y - NODE.height / 2})`}>
      <rect
        width={NODE.width}
        height={NODE.height}
        rx={10}
        fill={DEMO_COLORS.panel}
        stroke={DEMO_COLORS.brand}
        strokeWidth={2}
      />
      <text
        x={NODE.width / 2}
        y={NODE.height / 2 + 7}
        textAnchor="middle"
        fill={DEMO_COLORS.text}
        fontSize={20}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * An abstract vector diagram for the camera and departure previews, drawn
 * in the 960 by 600 coordinates those helpers default to.
 */
export function DemoDiagram() {
  const labels: Record<string, string> = {
    source: "Source",
    join: "Join",
    filter: "Filter",
    model: "Model",
    chart: "Chart",
    share: "Share",
  };
  return (
    <g>
      <rect width={960} height={600} fill={DEMO_COLORS.ground} />
      {EDGES.map(([from, to]) => {
        const start = _findNode(from);
        const end = _findNode(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={DEMO_COLORS.line}
            strokeWidth={3}
          />
        );
      })}
      {DIAGRAM_NODES.map((node) => (
        <DiagramNode
          key={node.id}
          x={node.x}
          y={node.y}
          label={labels[node.id]}
        />
      ))}
    </g>
  );
}

/** The rect a diagram node occupies, for cut-outs such as a departure. */
export function getDiagramNodeRect(id: (typeof DIAGRAM_NODES)[number]["id"]) {
  const node = _findNode(id);
  return {
    x: node.x - NODE.width / 2 - 8,
    y: node.y - NODE.height / 2 - 8,
    width: NODE.width + 16,
    height: NODE.height + 16,
  };
}
