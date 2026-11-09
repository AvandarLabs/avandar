import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChatGadgetLinkView } from "@/components/ChatPanel/ChatThread/Composer/ChatGadgetLinkView";
import { GadgetLink } from "@/components/RichText/Gadget/GadgetNodes/GadgetNodes";
import { createMentionMenuSuggestion } from "@/components/RichText/MentionMenu/createMentionMenuSuggestion";
import { UserMention } from "@/components/RichText/UserMention/UserMention";
import type { Extensions } from "@tiptap/core";

/** The chat composer's `@` suggestion, so Enter can tell when it is open. */
const CHAT_MENTION_PLUGIN_KEY = new PluginKey<{ active: boolean }>(
  "chatComposerMention",
);

/**
 * Enter sends, and never adds a paragraph. Shift+Enter keeps StarterKit's
 * line break. The `@` suggestion (priority 101) sees Enter first and picks
 * the highlighted row; when the menu is open with no row to pick, Enter
 * does nothing here. This must run before the core keymap, which would
 * split the paragraph: at the default priority, listed after StarterKit,
 * it does. A lower priority runs after the core keymap.
 */
const ChatComposerKeys = Extension.create<{ onSubmit: () => void }>({
  name: "chatComposerKeys",
  addOptions() {
    return {
      onSubmit: () => {},
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!CHAT_MENTION_PLUGIN_KEY.getState(editor.state)?.active) {
          this.options.onSubmit();
        }
        return true;
      },
    };
  },
});

/**
 * The chat composer's editor: paragraphs, line breaks, undo and redo, the
 * chat's `@` menu, and gadget links. Members are never mentioned here: the
 * mention node only hosts the `@` suggestion. The placeholder is a getter,
 * so it follows the page without rebuilding the extensions.
 */
export function createChatComposerExtensions(
  options: Readonly<{
    getPlaceholder: () => string;
    getWorkspaceId: () => string | undefined;
    onSubmit: () => void;
  }>,
): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      bold: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      heading: false,
      horizontalRule: false,
      italic: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      underline: false,
    }),
    Placeholder.configure({ placeholder: options.getPlaceholder }),
    UserMention.configure({
      suggestion: {
        ...createMentionMenuSuggestion({
          variant: "chat",
          getWorkspaceId: options.getWorkspaceId,
        }),
        pluginKey: CHAT_MENTION_PLUGIN_KEY,
      },
    }),
    // Extended here rather than at module load: the gadget nodes' module
    // imports reach back to the chat panel, so a module-level `extend` can
    // run before `GadgetLink` exists.
    GadgetLink.extend({
      addNodeView() {
        return ReactNodeViewRenderer(ChatGadgetLinkView);
      },
    }),
    ChatComposerKeys.configure({ onSubmit: options.onSubmit }),
  ];
}
