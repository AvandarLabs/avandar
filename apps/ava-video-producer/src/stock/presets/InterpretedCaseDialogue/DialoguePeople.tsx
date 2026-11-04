import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { DialogueGestures } from "./DialogueGestures";
import type { Input } from "./InterpretedCaseDialogue.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Direct participant-worker orientation keeps interpretation to one side. */
export function DialoguePeople({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d="M300 500 H660 M330 500 V540 M630 500 V540"
        stroke={STOCK.muted}
        strokeWidth={5}
      />
      {input.showSightlines ? (
        <line
          data-sightline=""
          x1={220}
          y1={467}
          x2={740}
          y2={467}
          stroke={STOCK.muted}
          strokeDasharray="4 6"
        />
      ) : undefined}
      <PersonGlyph x={210} y={485} posture="seated" color={accent} />
      <PersonGlyph x={750} y={485} posture="seated" color={accent} />
      <PersonGlyph x={480} y={510} posture="seated" color={STOCK.cyan} />
      <DialogueGestures frame={frame} accent={accent} />{" "}
      <LabelSlots
        labels={[
          [input.people.participant, 48, 550, 280, 12, 3],
          [input.people.worker, 650, 550, 280, 12, 3],
          [input.people.interpreter, 330, 550, 300, 12, 3],
        ]}
      />
    </g>
  );
}
