import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const MARKDOWN_PATTERN =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

/** Whether plain text carries markdown syntax worth converting. */
export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_PATTERN.test(text);
}

/**
 * Converts a plain-text paste that looks like markdown into rich content.
 * `@tiptap/markdown` parses but has no paste handler of its own. A paste
 * that carries HTML is left to the browser, which already keeps its
 * formatting.
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
            const text = clipboard.getData("text/plain");
            if (!looksLikeMarkdown(text) || !editor.markdown) {
              return false;
            }
            const parsedDocument = editor.markdown.parse(text);
            return editor.commands.insertContent(parsedDocument.content ?? []);
          },
        },
      }),
    ];
  },
});
