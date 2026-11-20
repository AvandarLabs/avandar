import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PrivateCaseConversation.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  person: Input["people"][number];
  waitingOpacity: number;
  accent: string;
};
/** A role owns its seat independently of the authored array order. */
export function ConversationPerson({
  frame,
  person,
  waitingOpacity,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const isSupporter = person.role === "supporter";
  const travel = motion.ramp(frame, 44, motion.scale(40), motion.travel.easing);
  const x = isSupporter
    ? mix(travel, 330, 780)
    : person.role === "participant"
      ? 220
      : 460;
  const y = isSupporter
    ? 410 -
      12 * motion.ramp(frame, 36, motion.whip, motion.entrance.easing) +
      12 * motion.ramp(frame, 84, motion.whip, motion.entrance.easing)
    : 290;
  const posture =
    isSupporter && frame >= 36 && frame < 92 ? "walking" : "seated";
  return (
    <g
      data-person={person.id}
      data-space={isSupporter && travel === 1 ? "waiting" : "meeting"}
      opacity={isSupporter ? waitingOpacity : 1}
    >
      <PersonGlyph
        x={x}
        y={y}
        posture={posture}
        role={person.role === "worker" ? "worker" : "participant"}
        color={isSupporter ? tokens.color.highlight : accent}
      />
      <circle data-person-anchor={person.id} cx={x} cy={y} r={0} fill="none" />
      <LabelSlots
        labels={[[person.label, x - 105, isSupporter ? 483 : 218, 210, 14, 3]]}
      />
    </g>
  );
}
