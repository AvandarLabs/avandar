import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { isRichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("UserMention", () => {
  it("removes the whole mention, trigger included, on Backspace", () => {
    editor = new Editor({
      extensions: createRichTextExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Ask " },
              { type: "userMention", attrs: { id: MEMBER_ID } },
            ],
          },
        ],
      },
    });
    editor.commands.focus("end");
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.getJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Ask " }],
        },
      ],
    });
  });

  it("stores only the member id, so a saved mention passes the strict schema", () => {
    editor = new Editor({
      extensions: createRichTextExtensions(),
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    editor.commands.focus("end");
    editor.commands.insertContent({
      type: "userMention",
      attrs: { id: MEMBER_ID, label: "Priya", mentionSuggestionChar: "@" },
    });
    const document = editor.getJSON();
    expect(document.content?.[0]?.content?.[0]).toEqual({
      type: "userMention",
      attrs: { id: MEMBER_ID },
    });
    expect(isRichTextDocument(document)).toBe(true);
  });
});
