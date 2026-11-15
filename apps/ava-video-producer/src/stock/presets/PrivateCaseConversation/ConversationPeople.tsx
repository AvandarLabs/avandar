import { ramp } from "../../../motion";
import { ConversationPerson } from "./ConversationPerson";
import { WaitingSpace } from "./WaitingSpace";
import type { Input } from "./PrivateCaseConversation.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Inset visibility changes neither the meeting roles nor the walking path. */
export function ConversationPeople({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const opacity = input.showWaitingSupporter ? 1 : 1 - ramp(frame, 84, 12);
  return (
    <g>
      <WaitingSpace input={input} opacity={opacity} />
      {input.people.map((person) => (
        <ConversationPerson
          key={person.id}
          person={person}
          frame={frame}
          waitingOpacity={opacity}
          accent={accent}
        />
      ))}
    </g>
  );
}
