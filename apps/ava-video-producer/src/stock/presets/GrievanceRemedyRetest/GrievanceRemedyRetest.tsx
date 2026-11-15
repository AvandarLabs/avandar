import { STOCK, type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { RemedyActions } from "./RemedyActions";
import { RemedyObject } from "./RemedyObject";
import { RemedyResponse } from "./RemedyResponse";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Repair, participant operation and acceptance remain independent facts. */
export function GrievanceRemedyRetest({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-complaint-state={
        frame >= 120 && input.participantResponse === "accepted"
          ? "closed"
          : "open"
      }
    >
      <LabelSlots
        labels={[
          [input.labels.example, 48, 38, 864, 18, 1],
          [input.people.participant, 48, 130, 300, 14, 3],
          [input.people.worker, 612, 130, 300, 14, 3],
          [input.object.label, 350, 165, 260, 16, 3],
        ]}
      />
      <PersonGlyph x={200} y={310} color={accent} />
      <PersonGlyph x={760} y={310} color={STOCK.cyan} role="worker" />
      <RemedyObject frame={frame} input={input} accent={accent} />
      <RemedyActions frame={frame} input={input} accent={accent} />
      <RemedyResponse frame={frame} input={input} accent={accent} />
    </g>
  );
}
