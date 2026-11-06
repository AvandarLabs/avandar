import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { PasteMarkdown } from "@/components/RichText/PasteMarkdown/PasteMarkdown";
import { SafeLink } from "@/components/RichText/SafeLink/SafeLink";
import { UserMention } from "@/components/RichText/UserMention/UserMention";
import type { Extensions } from "@tiptap/core";
import type { MentionOptions } from "@tiptap/extension-mention";

/**
 * The one extension list behind every rich text surface: the composer adds
 * a placeholder and the `@` suggestion; the static renderer uses it bare.
 * New node types, such as object references and embeds, are added here so
 * the editor and the renderer can never disagree.
 */
export function createRichTextExtensions(
  options: Readonly<{
    placeholder?: string;
    mentionSuggestion?: MentionOptions["suggestion"];
  }> = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: false,
    }),
    SafeLink,
    Placeholder.configure({ placeholder: options.placeholder ?? "" }),
    UserMention.configure(
      options.mentionSuggestion
        ? { suggestion: options.mentionSuggestion }
        : {},
    ),
    Markdown,
    PasteMarkdown,
  ];
}
