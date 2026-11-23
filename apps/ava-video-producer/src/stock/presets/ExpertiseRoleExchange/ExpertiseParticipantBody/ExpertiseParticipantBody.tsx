import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { ExpertiseParticipantLabels } from "../ExpertiseParticipantLabels/ExpertiseParticipantLabels";
import { ExpertiseDemonstrationLabel } from "./ExpertiseDemonstrationLabel/ExpertiseDemonstrationLabel";
import { ExpertiseToolContact } from "./ExpertiseToolContact/ExpertiseToolContact";
import type { Motion } from "../../../../motion";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["people"][number];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  frame: number;
  index: number;
  labelX: number;
  input: Input;
  x: number;
  accent: string;
  handX: ReturnType<typeof Motion.mix>;
  handY: ReturnType<typeof Motion.mix>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  isExpert: boolean;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  transfer: boolean;
};

/** Renders the person id with authored geometry. */
export function ExpertiseParticipantBody({
  person,
  motion,
  frame,
  index,
  labelX,
  input,
  x,
  accent,
  handX,
  handY,
  tokens,
  isExpert,
  scales,
  transfer,
}: Readonly<Props>): ReactNode {
  return (
    <g
      key={person.id}
      data-person-id={person.id}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <ExpertiseParticipantLabels {...{ person, labelX, input }} />
      <PersonGlyph x={x} y={290} size={72} color={accent} />
      <ExpertiseToolContact
        {...{ person, x, accent, handX, handY, tokens, isExpert }}
        scales={scales}
        transfer={transfer}
      />
      <ExpertiseDemonstrationLabel
        {...{ motion, frame, index, input, isExpert }}
      />
    </g>
  );
}
