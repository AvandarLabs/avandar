import { STOCK, type GraphicProps } from "../../graphics-common";
import { CohortLane } from "./CohortLane";
import { CohortLegend } from "./CohortLegend";
import { SceneLabel } from "./SceneLabel";
import { VisitHeader } from "./VisitHeader";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Visit arches pass over a fixed set of identity lanes. */
export function DoseCohortReturnPaths({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel text={input.sceneLabel} x={32} y={30} width={700} />
      <SceneLabel text={input.copy.baseline} x={32} y={60} width={360} />
      <text x={415} y={60} fill={STOCK.text} fontSize={18}>
        {input.participants.length}
      </text>
      {input.visits.map((visit, index) => (
        <VisitHeader
          key={visit.id}
          input={input}
          visit={visit}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      {input.participants.map((participant, index) => (
        <CohortLane
          key={participant.id}
          input={input}
          participant={participant}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <CohortLegend input={input} />
    </g>
  );
}
