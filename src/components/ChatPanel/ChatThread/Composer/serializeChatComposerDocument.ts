import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { createGadgetRefFromAttrs } from "@/components/RichText/Gadget/GadgetNodes/createGadgetRefFromAttrs";
import type { JSONContent } from "@tiptap/core";

function _inlineText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type === "gadgetLink") {
    const ref = createGadgetRefFromAttrs(node.attrs ?? {});
    return ref && ChatMentionToken.isTokenizable(ref)
      ? ChatMentionToken.buildToken(ref)
      : "";
  }
  return (node.content ?? []).map(_inlineText).join("");
}

/**
 * The chat composer's document as the message text the thread stores: one
 * line per paragraph, line breaks kept, and each gadget chip as a ref
 * token. A chip whose ref is malformed, of a type the chat does not offer,
 * or whose token would not parse back to that ref (such as a block id with
 * a space), is dropped, so no raw uuid reaches the text. Pasted text is
 * never turned into a token here.
 */
export function serializeChatComposerDocument(document: JSONContent): string {
  return (document.content ?? []).map(_inlineText).join("\n");
}
