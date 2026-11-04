import { ramp } from "../../../motion";
import { DrawPath } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import { RemovedDeviationGuides } from "./RemovedDeviationGuides";
import { SourceVertices } from "./SourceVertices";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Original and retained traces share fixed source-vertex coordinates. */
export function DetailTrace({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { keptIndices } = makeDetailSimplificationFromInput(input);
  const original = input.vertices
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${60 + x * 3.6} ${160 + y * 3.6}`,
    )
    .join(" ");
  const simplified = keptIndices
    .map(
      (index, position) =>
        `${position ? "L" : "M"}${60 + input.vertices[index][0] * 3.6} ${160 + input.vertices[index][1] * 3.6}`,
    )
    .join(" ");
  return (
    <g>
      <DrawPath
        d={original}
        frame={frame}
        at={13}
        duration={37}
        color={STOCK.muted}
        width={2}
        opacity={1 - ramp(frame, 111, 28) * 0.7}
      />
      {input.showDeviationGuides ? (
        <RemovedDeviationGuides input={input} frame={frame} />
      ) : undefined}
      <DrawPath
        d={simplified}
        frame={frame}
        at={111}
        duration={28}
        color={accent}
        width={3}
      />
      <SourceVertices input={input} frame={frame} accent={accent} />
    </g>
  );
}
