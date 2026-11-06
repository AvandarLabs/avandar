import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { isSafeLinkHref } from "$/models/RichTextDocument/RichTextDocument";
import type { JSONContent } from "@tiptap/core";

const MARKDOWN_PATTERN =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

/** Whether plain text carries markdown syntax worth converting. */
export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_PATTERN.test(text);
}

/**
 * Content with every link mark whose href is not a web or email link
 * removed. Markdown parsing builds marks directly, so it skips the link
 * extension's own href check.
 */
function _removeUnsafeLinks(content: JSONContent): JSONContent {
  const marks = content.marks?.filter((mark) => {
    return (
      mark.type !== "link" || isSafeLinkHref(String(mark.attrs?.href ?? ""))
    );
  });
  return {
    ...content,
    ...(marks ? { marks } : {}),
    ...(content.content
      ? { content: content.content.map(_removeUnsafeLinks) }
      : {}),
  };
}

/**
 * Converts a plain-text paste that looks like markdown into rich content.
 * `@tiptap/markdown` parses but has no paste handler of its own. A paste
 * that carries HTML is left to the browser, which already keeps its
 * formatting, and a paste into code stays literal text.
 */
export const PasteMarkdown = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("pasteMarkdown"),
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard || clipboard.types.includes("text/html")) {
              return false;
            }
            if (editor.isActive("codeBlock") || editor.isActive("code")) {
              return false;
            }
            const text = clipboard.getData("text/plain");
            if (!looksLikeMarkdown(text) || !editor.markdown) {
              return false;
            }
            const parsedDocument = _removeUnsafeLinks(
              editor.markdown.parse(text),
            );
            return editor.commands.insertContent(parsedDocument.content ?? []);
          },
        },
      }),
    ];
  },
});
