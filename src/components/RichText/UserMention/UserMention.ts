import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { createElement } from "react";
import { UserMentionChip } from "@/components/RichText/UserMention/UserMentionChip";
import type { NodeViewProps } from "@tiptap/react";

function UserMentionNodeView({ node }: NodeViewProps) {
  return createElement(
    NodeViewWrapper,
    { as: "span" },
    createElement(UserMentionChip, { userId: String(node.attrs.id ?? "") }),
  );
}

/**
 * A mention of a workspace member. Stores only the user id, never the
 * name, so a renamed member always shows their current name.
 */
export const UserMention = Mention.extend({
  name: "userMention",

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
