import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ConversationParticipant } from "./ConversationParticipant";
import type { Input } from "../PrivateCaseConversation.schema";
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
    ? Motion.mix({
        t: travel,
        from: 330,
        to: 780,
      })
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
    <ConversationParticipant
      person={person}
      waitingOpacity={waitingOpacity}
      accent={accent}
      tokens={tokens}
      isSupporter={isSupporter}
      travel={travel}
      x={x}
      y={y}
      posture={posture}
    />
  );
}
