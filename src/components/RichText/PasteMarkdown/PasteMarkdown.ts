import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { getSafeLinkHrefFromInput } from "@/components/RichText/SafeLink/SafeLink";
import type { JSONContent } from "@tiptap/core";

const MARKDOWN_PATTERN =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

/** Whether plain text carries markdown syntax worth converting. */
export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_PATTERN.test(text);
}

/** A mark with a link's href made safe, or `undefined` to drop the link. */
function _buildSafeMark(
  mark: NonNullable<JSONContent["marks"]>[number],
): NonNullable<JSONContent["marks"]>[number] | undefined {
  if (mark.type !== "link") {
    return mark;
  }
  const href = getSafeLinkHrefFromInput(String(mark.attrs?.href ?? ""));
  return href ? { ...mark, attrs: { ...mark.attrs, href } } : undefined;
}

/**
 * Content whose links all point at web or email addresses: scheme-less
 * addresses gain a scheme and any other link is removed, keeping its text.
 * Markdown parsing builds marks directly, so it skips the link extension's
 * own href check.
 */
function _makeLinksSafe(content: JSONContent): JSONContent {
  const marks = content.marks?.flatMap((mark) => {
    return _buildSafeMark(mark) ?? [];
  });
  return {
    ...content,
    ...(marks ? { marks } : {}),
    ...(content.content
      ? { content: content.content.map(_makeLinksSafe) }
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
            const parsedDocument = _makeLinksSafe(editor.markdown.parse(text));
            return editor.commands.insertContent(parsedDocument.content ?? []);
          },
        },
      }),
    ];
  },
});
