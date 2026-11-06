import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";

function UserMentionNodeView({ node }: NodeViewProps): ReactNode {
  return (
    <NodeViewWrapper as="span">
      <UserMentionChip userId={String(node.attrs.id ?? "")} />
    </NodeViewWrapper>
  );
}

/**
 * A mention of a workspace member. Stores only the user id, never the
 * name, so a renamed member always shows their current name. Backspace
 * after a mention deletes it whole rather than turning it back into `@`.
 */
export const UserMention = Mention.extend({
  name: "userMention",

  addOptions() {
    return { ...Mention.options, deleteTriggerWithBackspace: true };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-id");
        },
        renderHTML: (attributes) => {
          return { "data-id": attributes.id };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-type": "userMention" }, HTMLAttributes),
      "@",
    ];
  },

  renderText() {
    return "@";
  },

  addNodeView() {
    return ReactNodeViewRenderer(UserMentionNodeView);
  },
});
