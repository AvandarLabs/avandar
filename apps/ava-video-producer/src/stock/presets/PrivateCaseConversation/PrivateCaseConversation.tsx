import { type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ConversationFurniture } from "./ConversationFurniture";
import { ConversationPartition } from "./ConversationPartition";
import { ConversationPeople } from "./ConversationPeople";
import type { Input } from "./PrivateCaseConversation.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** The supporter waits nearby after a participant requests privacy. */
export function PrivateCaseConversation({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.example, 48, 38, 864, 18, 1],
          [input.requestLabel, 70, 96, 510, 16, 3],
          [input.roomLabels.meeting, 70, 173, 500, 14, 2],
          [input.copy.hold, 48, 551, 864, 18, 2],
        ]}
      />
      <ConversationFurniture />
      <ConversationPartition frame={frame} partition={input.partition} />
      <ConversationPeople frame={frame} input={input} accent={accent} />
    </g>
  );
}
