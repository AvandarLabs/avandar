import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { useMemo } from "react";
import rough from "roughjs";
import type { EdgeProps } from "@xyflow/react";

/**
 * Excalidraw-style hand-drawn edge for the plan DAG.
 *
 * We let xyflow lay out the curve via `getBezierPath`, then re-trace
 * that path with RoughJS so it picks up the wobbly stroke + arrowhead
 * that makes the canvas feel sketched rather than slick.
 *
 * Performance notes:
 *   - RoughJS regenerates an SVG path from a `roughness` seed each
 *     render. We memoize on `(sourceX, sourceY, targetX, targetY,
 *     selected)` so a single drag of an unrelated node doesn't retrace
 *     all edges.
 *   - The arrowhead is its own rough polygon at the target end, not a
 *     SVG `marker-end`. Markers ship straight lines; the only way to
 *     get the wobble at the tip is to draw the polygon ourselves.
 */
export function RoughEdge(props: EdgeProps): JSX.Element {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    label,
    style,
  } = props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Stable seed per-edge so the wobble doesn't morph across renders.
  // Hash the id into a 16-bit positive integer (RoughJS' seed type).
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 65535;
  }, [id]);

  const { roughPathD, arrowD } = useMemo(() => {
    // RoughJS needs a temporary SVG node to draw into so we can read
    // back the generated `<path d="...">`. We never mount the temp
    // node; we just harvest its child paths.
    const svgNs = "http://www.w3.org/2000/svg";
    const tmpSvg = document.createElementNS(svgNs, "svg");
    const rc = rough.svg(tmpSvg);

    const line = rc.path(edgePath, {
      roughness: 1.6,
      bowing: 1.4,
      stroke: selected ? "#1c7ed6" : "#495057",
      strokeWidth: selected ? 2 : 1.4,
      seed,
    });

    // Arrowhead: compute the tangent at the target by sampling the
    // curve near (targetX, targetY). For SmoothStep / Bezier paths
    // this is a near-zero-cost approximation since we already have
    // start/end coords.
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const arrowLen = 14;
    const arrowWidth = 7;
    const baseX = targetX - ux * arrowLen;
    const baseY = targetY - uy * arrowLen;
    const leftX = baseX + uy * arrowWidth;
    const leftY = baseY - ux * arrowWidth;
    const rightX = baseX - uy * arrowWidth;
    const rightY = baseY + ux * arrowWidth;
    const arrowPath = `M ${targetX} ${targetY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
    const arrow = rc.path(arrowPath, {
      roughness: 1.4,
      bowing: 1,
      stroke: selected ? "#1c7ed6" : "#495057",
      strokeWidth: selected ? 1.8 : 1.4,
      fill: selected ? "#1c7ed6" : "#495057",
      fillStyle: "solid",
      seed: seed + 1,
    });

    // Extract the generated SVG `d` attributes.
    const pickD = (group: SVGGElement): string => {
      const paths = Array.from(group.querySelectorAll("path"));
      return paths
        .map((p) => {
          return p.getAttribute("d") ?? "";
        })
        .filter(Boolean)
        .join(" ");
    };

    return {
      roughPathD: pickD(line),
      arrowD: pickD(arrow),
    };
  }, [edgePath, sourceX, sourceY, targetX, targetY, selected, seed]);

  return (
    <>
      <BaseEdge
        id={id}
        path={roughPathD || edgePath}
        style={{
          fill: "none",
          stroke: selected ? "#1c7ed6" : "#495057",
          strokeWidth: selected ? 2 : 1.4,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          ...(style ?? {}),
        }}
      />
      {arrowD ?
        <path
          d={arrowD}
          fill={selected ? "#1c7ed6" : "#495057"}
          stroke={selected ? "#1c7ed6" : "#495057"}
          strokeWidth={selected ? 1.8 : 1.4}
          strokeLinejoin="round"
        />
      : null}
      {label ?
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${
                (sourceX + targetX) / 2
              }px,${(sourceY + targetY) / 2}px)`,
              background: "white",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily:
                'Caveat, "Patrick Hand", "Comic Sans MS", system-ui',
              color: "#495057",
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      : null}
    </>
  );
}
