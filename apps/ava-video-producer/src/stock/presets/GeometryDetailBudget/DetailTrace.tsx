import { DrawPath } from "../../graphics-common/DrawPath";
import { useGraphicMotion, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const { atomic } = useGraphicTheme();
  const { color, stroke } = useGraphicTokens();
  const motion = useGraphicMotion();
  const { keptIndices } = makeDetailSimplificationFromInput(input);
  const original = input.vertices
    .map(([x, y], index) => {
      return `${index ? "L" : "M"}${60 + x * 3.6} ${160 + y * 3.6}`;
    })
    .join(" ");
  const simplified = keptIndices
    .map((index, position) => {
      return `${position ? "L" : "M"}${60 + input.vertices[index][0] * 3.6} ${160 + input.vertices[index][1] * 3.6}`;
    })
    .join(" ");
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
