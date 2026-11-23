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

function _getLinkHrefs(target: Editor): string[] {
  const hrefs: string[] = [];
  target.state.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "link") {
        hrefs.push(String(mark.attrs.href));
      }
    });
  });
  return hrefs;
}

function _type(target: Editor, text: string): void {
  // Insert one character per transaction, the way typing does, so the
  // autolink plugin sees the space that ends a word.
  text.split("").forEach((character) => {
    target.commands.insertContent(character);
  });
}

describe("createRichTextExtensions autolinks", () => {
  it("links a typed bare domain to its https address", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _type(editor, "see example.com ");
    expect(_getLinkHrefs(editor)).toEqual(["https://example.com"]);
  });

  it("links a typed www address to its https address", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _type(editor, "www.example.org ");
    expect(_getLinkHrefs(editor)).toEqual(["https://www.example.org"]);
  });

  it("links a typed email address as a mailto link", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _type(editor, "dana@example.org ");
    expect(_getLinkHrefs(editor)).toEqual(["mailto:dana@example.org"]);
  });

  it("never links typed script", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _type(editor, "javascript:alert(1) ");
    expect(_getLinkHrefs(editor)).toEqual([]);
  });
});

describe("createRichTextExtensions link box", () => {
  it("adds https to an address entered without a scheme", () => {
    editor = _createEditorWithSelectedText();
    expect(editor.commands.setLink({ href: "example.com/lab" })).toBe(true);
    expect(_getLinkHrefs(editor)).toEqual(["https://example.com/lab"]);
  });

  it("adds mailto to an email address entered without a scheme", () => {
    editor = _createEditorWithSelectedText();
    expect(editor.commands.setLink({ href: "dana@example.org" })).toBe(true);
    expect(_getLinkHrefs(editor)).toEqual(["mailto:dana@example.org"]);
  });

  it("refuses an entry that is not an address", () => {
    editor = _createEditorWithSelectedText();
    expect(editor.commands.setLink({ href: "not a link" })).toBe(false);
    expect(_getLinkHrefs(editor)).toEqual([]);
  });
});

/**
 * A paste event without clipboard data. jsdom has no `ClipboardEvent`,
 * which ProseMirror would otherwise construct for a programmatic paste.
 */
function _createPasteEvent(): ClipboardEvent {
  return new Event("paste") as ClipboardEvent;
}

describe("createRichTextExtensions pasted links", () => {
  it("never links selected text to a pasted address with another scheme", () => {
    editor = _createEditorWithSelectedText();
    editor.view.pasteText("ftp://x.com", _createPasteEvent());
    expect(_getLinkHrefs(editor)).toEqual([]);
  });

  it("never links selected text to a pasted file address", () => {
    editor = _createEditorWithSelectedText();
    editor.view.pasteText("file:///etc/passwd", _createPasteEvent());
    expect(_getLinkHrefs(editor)).toEqual([]);
  });

  it("links selected text to a pasted bare domain with https", () => {
    editor = _createEditorWithSelectedText();
    editor.view.pasteText("example.com", _createPasteEvent());
    expect(_getLinkHrefs(editor)).toEqual(["https://example.com"]);
  });

  it("adds https to a pasted HTML link whose href has no scheme", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    editor.view.pasteHTML(
      '<p><a href="example.com">the lab</a></p>',
      _createPasteEvent(),
    );
    expect(_getLinkHrefs(editor)).toEqual(["https://example.com"]);
  });

  it("adds mailto to a pasted HTML link whose href is a bare email", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    editor.view.pasteHTML(
      '<p><a href="dana@x.org">Dana</a></p>',
      _createPasteEvent(),
    );
    expect(_getLinkHrefs(editor)).toEqual(["mailto:dana@x.org"]);
  });

  it("drops a pasted HTML link with a disallowed href, keeping its text", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    editor.view.pasteHTML(
      '<p><a href="ftp://x.com/a">files</a></p>',
      _createPasteEvent(),
    );
    expect(_getLinkHrefs(editor)).toEqual([]);
    expect(editor.getText()).toBe("files");
  });
});
