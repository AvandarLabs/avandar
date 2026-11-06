import { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { afterEach, describe, expect, it } from "vitest";
import { isRichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import { looksLikeMarkdown } from "@/components/RichText/PasteMarkdown/PasteMarkdown";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function _paste(
  target: Editor,
  text: string,
  types: string[] = ["text/plain"],
): boolean {
  const event = {
    clipboardData: {
      types,
      getData: (type: string) => {
        return type === "text/plain" ? text : "";
      },
    },
  } as unknown as ClipboardEvent;
  return (
    target.view.someProp("handlePaste", (handlePaste) => {
      return handlePaste(target.view, event, Slice.empty);
    }) ?? false
  );
}

describe("looksLikeMarkdown", () => {
  it("spots lists, emphasis, and links", () => {
    expect(looksLikeMarkdown("- one\n- two")).toBe(true);
    expect(looksLikeMarkdown("Rash onset **Oct 24**")).toBe(true);
    expect(looksLikeMarkdown("See [the lab](https://example.org)")).toBe(true);
  });

  it("leaves ordinary prose alone", () => {
    expect(looksLikeMarkdown("Called the clinic at 9 AM.")).toBe(false);
  });
});

describe("PasteMarkdown", () => {
  it("turns pasted markdown into formatted content", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    expect(_paste(editor, "- Serum for IgM\n- NP swab for PCR")).toBe(true);
    expect(editor.getJSON().content?.[0]?.type).toBe("bulletList");
  });

  it("lets the browser handle a paste that carries HTML", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    expect(_paste(editor, "- one", ["text/plain", "text/html"])).toBe(false);
  });

  it("drops a pasted link that could run script, keeping its text", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    expect(_paste(editor, "See [x](javascript:alert(1)) **now**")).toBe(true);
    const document = editor.getJSON();
    expect(JSON.stringify(document)).not.toContain("javascript:");
    expect(editor.getText()).toContain("See x now");
    expect(isRichTextDocument(document)).toBe(true);
  });

  it("keeps a pasted web link", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _paste(editor, "See [the lab](https://example.org/lab)");
    expect(JSON.stringify(editor.getJSON())).toContain(
      '"href":"https://example.org/lab"',
    );
  });

  it("adds https to a pasted link written without a scheme", () => {
    editor = new Editor({ extensions: createRichTextExtensions() });
    _paste(editor, "See [the lab](example.org/lab)");
    expect(JSON.stringify(editor.getJSON())).toContain(
      '"href":"https://example.org/lab"',
    );
  });

  it("pastes markdown as typed text inside a code block", () => {
    editor = new Editor({
      extensions: createRichTextExtensions(),
      content: {
        type: "doc",
        content: [
          { type: "codeBlock", content: [{ type: "text", text: "x" }] },
        ],
      },
    });
    editor.commands.focus("end");
    expect(_paste(editor, "- one\n- two")).toBe(false);
  });
});
