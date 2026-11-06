import { describe, expect, it } from "vitest";
import {
  getMentionedUserIds,
  isRichTextDocument,
  parseRichTextDocument,
  richTextToPlainText,
} from "$/models/RichTextDocument/RichTextDocument.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function _paragraph(
  ...content: RichTextDocument.Node[]
): RichTextDocument.Node {
  return { type: "paragraph", content };
}

function _text(text: string): RichTextDocument.Node {
  return { type: "text", text };
}

function _mention(id: string): RichTextDocument.Node {
  return { type: "userMention", attrs: { id } };
}

const DOCUMENT: RichTextDocument.T = {
  type: "doc",
  content: [
    _paragraph(_text("Specimens for "), _mention(MEMBER_ID)),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [_paragraph(_text("Serum"))] },
        {
          type: "listItem",
          content: [_paragraph(_mention(MEMBER_ID), _mention(OTHER_ID))],
        },
      ],
    },
  ],
};

describe("parseRichTextDocument", () => {
  it("accepts a document built from the comment editor's nodes", () => {
    expect(parseRichTextDocument(DOCUMENT)).toEqual(DOCUMENT);
  });

  it("rejects a node type the editor does not know", () => {
    const withEmbed = {
      type: "doc",
      content: [{ type: "objectEmbed", attrs: { id: "x" } }],
    };
    expect(() => {
      return parseRichTextDocument(withEmbed);
    }).toThrow();
    expect(isRichTextDocument(withEmbed)).toBe(false);
  });

  it("accepts web and email links", () => {
    expect(
      isRichTextDocument(_documentWithLink("https://example.org/case")),
    ).toBe(true);
    expect(
      isRichTextDocument(_documentWithLink("MAILTO:lab@example.org")),
    ).toBe(true);
  });

  it("rejects a link whose href could run script", () => {
    expect(isRichTextDocument(_documentWithLink("javascript:alert(1)"))).toBe(
      false,
    );
  });

  it("rejects a mention whose id is not a user id", () => {
    const withBadMention = {
      type: "doc",
      content: [_paragraph({ type: "userMention", attrs: { id: "priya" } })],
    };
    expect(isRichTextDocument(withBadMention)).toBe(false);
  });

  it("rejects a text node without text", () => {
    const withEmptyText = {
      type: "doc",
      content: [_paragraph({ type: "text" })],
    };
    expect(isRichTextDocument(withEmptyText)).toBe(false);
  });
});

function _documentWithLink(href: string): RichTextDocument.T {
  return {
    type: "doc",
    content: [
      _paragraph({
        type: "text",
        text: "results",
        marks: [{ type: "link", attrs: { href, target: "_blank" } }],
      }),
    ],
  };
}

describe("richTextToPlainText", () => {
  it("puts each block on its own line and labels mentions", () => {
    const plainText = richTextToPlainText(DOCUMENT, {
      getMentionLabel: (userId) => {
        return userId === MEMBER_ID ? "Priya" : undefined;
      },
    });
    expect(plainText).toBe("Specimens for @Priya\nSerum\n@Priya@member");
  });
});

describe("getMentionedUserIds", () => {
  it("returns each mentioned user once, in document order, including nested ones", () => {
    expect(getMentionedUserIds(DOCUMENT)).toEqual([MEMBER_ID, OTHER_ID]);
  });
});
