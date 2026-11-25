import { DrawPath } from "../../graphics-common/DrawPath";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import { RemovedDeviationGuides } from "./RemovedDeviationGuides";
import { SourceVertices } from "./SourceVertices";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const ORIGINAL_AT = 13;
const ORIGINAL_FRAMES = 37;
const SIMPLIFIED_AT = 111;
const SIMPLIFIED_FRAMES = 28;
/** Original and retained traces share fixed source-vertex coordinates. */
export function DetailTrace({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { keptIndices } = makeDetailSimplificationFromInput(input);
  const original = _buildTracePath(input.vertices);
  const simplified = _buildTracePath(
    keptIndices.map((index) => {
      return input.vertices[index];
    }),
  );
  return (
    <g>
      <DrawPath
        d={original}
        frame={frame}
        at={ORIGINAL_AT}
        duration={ORIGINAL_FRAMES}
        color={color.inactive}
        width={stroke.default}
        opacity={
          1 -
          motion.ramp(frame, SIMPLIFIED_AT, motion.scale(SIMPLIFIED_FRAMES)) *
            atomic.opacity["70"]
        }
      />
      {input.showDeviationGuides ? (
        <RemovedDeviationGuides input={input} frame={frame} />
      ) : undefined}
      <DrawPath
        d={simplified}
        frame={frame}
        at={SIMPLIFIED_AT}
        duration={SIMPLIFIED_FRAMES}
        color={accent}
        width={stroke.emphasis}
      />
      <SourceVertices input={input} frame={frame} accent={accent} />
    </g>
  );
}
/** A polyline through source vertices, in the shared trace coordinates. */
function _buildTracePath(vertices: Input["vertices"]): string {
  return vertices
    .map(([x, y], index) => {
      return `${index ? "L" : "M"}${60 + x * 3.6} ${160 + y * 3.6}`;
    })
    .join(" ");
}
