import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function _createEditorWithSelectedText(): Editor {
  const createdEditor = new Editor({
    extensions: createRichTextExtensions(),
    content: "<p>results</p>",
  });
  createdEditor.commands.selectAll();
  return createdEditor;
}

describe("createRichTextExtensions", () => {
  it("refuses links the stored document would reject", () => {
    editor = _createEditorWithSelectedText();
    expect(editor.commands.setLink({ href: "ftp://example.org/file" })).toBe(
      false,
    );
    expect(editor.commands.setLink({ href: "javascript:alert(1)" })).toBe(
      false,
    );
  });

  it("allows web and email links", () => {
    editor = _createEditorWithSelectedText();
    expect(editor.commands.setLink({ href: "mailto:lab@example.org" })).toBe(
      true,
    );
    expect(editor.commands.setLink({ href: "https://example.org" })).toBe(true);
  });
});
