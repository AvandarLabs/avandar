import { useMessagePartText } from "@assistant-ui/react";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import css from "../MessageTextPart/MessageTextPart.module.css";
import type { ReactNode } from "react";

/**
 * A user message's text with each gadget mention drawn as a chip that
 * opens the gadget, showing its current name, or its "Unavailable" label
 * when the user can no longer open it. Plain text keeps its line breaks:
 * the runs inherit the block's `white-space: pre-wrap`.
 */
export function UserMessageTextPart(): ReactNode {
  const { text } = useMessagePartText();
  return (
    <div className={css.messageText}>
      {ChatMentionToken.parse(text).map((segment, index) => {
        // Segments come from the message's fixed text, so their order and
        // positions never change between renders.
        const key = `${segment.kind}-${index}`;
        return segment.kind === "text" ? (
          <span key={key}>{segment.text}</span>
        ) : (
          <GadgetChip key={key} gadgetRef={segment.ref} />
        );
      })}
    </div>
  );
}
