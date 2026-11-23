import { NodeViewWrapper } from "@tiptap/react";
import {
  GadgetChip,
  UnknownGadgetChip,
} from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { createGadgetRefFromAttrs } from "@/components/RichText/Gadget/GadgetNodes/createGadgetRefFromAttrs";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";

/**
 * A gadget link in the chat composer: a plain chip that never leaves the
 * draft, without the comment editor's menu, since the chat has no embeds
 * to switch to.
 */
export function ChatGadgetLinkView({ node }: NodeViewProps): ReactNode {
  const gadgetRef = createGadgetRefFromAttrs(node.attrs);
  return (
    <NodeViewWrapper as="span">
      {gadgetRef ? (
        <GadgetChip gadgetRef={gadgetRef} isLinked={false} tabIndex={-1} />
      ) : (
        <UnknownGadgetChip />
      )}
    </NodeViewWrapper>
  );
}
