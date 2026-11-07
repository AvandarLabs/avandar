import { describe, expect, it } from "vitest";
import {
  getMentionedUserIds,
  isRichTextDocument,
  isSafeLinkHref,
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

  it("rejects a mention that carries a name", () => {
    const withNamedMention = {
      type: "doc",
      content: [
        _paragraph({
          type: "userMention",
          attrs: { id: MEMBER_ID, label: "Priya" },
        }),
      ],
    };
    expect(isRichTextDocument(withNamedMention)).toBe(false);
  });

  it("rejects a mention with an unknown top-level key", () => {
    const withExtraKey = {
      type: "doc",
      content: [
        _paragraph({
          type: "userMention",
          attrs: { id: MEMBER_ID },
          text: "@Priya",
        }),
      ],
    };
    expect(isRichTextDocument(withExtraKey)).toBe(false);
  });

  it("accepts a bold mention", () => {
    const withBoldMention = {
      type: "doc",
      content: [
        _paragraph({
          type: "userMention",
          attrs: { id: MEMBER_ID },
          marks: [{ type: "bold" }],
        }),
      ],
    };
    expect(isRichTextDocument(withBoldMention)).toBe(true);
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

/**
 * Bodies the stored-document schema would reject. A stored body is read
 * without parsing, so these must never throw while the page renders.
 */
const MALFORMED_DOCUMENTS: ReadonlyArray<[string, unknown]> = [
  ["a null child", { type: "doc", content: [null] }],
  ["content that is not an array", { type: "doc", content: {} }],
  [
    "a node missing its type",
    {
      type: "doc",
      content: [
        { content: [{ type: "text", text: "Serum" }, _mention(MEMBER_ID)] },
      ],
    },
  ],
];

describe("malformed documents", () => {
  it.each(MALFORMED_DOCUMENTS)(
    "reads plain text from a document with %s without throwing",
    (_label, document) => {
      expect(() => {
        return richTextToPlainText(document as RichTextDocument.T);
      }).not.toThrow();
    },
  );

  it.each(MALFORMED_DOCUMENTS)(
    "reads mentions from a document with %s without throwing",
    (_label, document) => {
      expect(() => {
        return getMentionedUserIds(document as RichTextDocument.T);
      }).not.toThrow();
    },
  );

  it("keeps the readable text and mentions of a node missing its type", () => {
    const document = MALFORMED_DOCUMENTS[2]![1] as RichTextDocument.T;
    expect(richTextToPlainText(document)).toBe("Serum@member");
    expect(getMentionedUserIds(document)).toEqual([MEMBER_ID]);
  });
});

describe("isSafeLinkHref", () => {
  it("allows web and email links in any case", () => {
    expect(isSafeLinkHref("https://example.org")).toBe(true);
    expect(isSafeLinkHref("http://example.org")).toBe(true);
    expect(isSafeLinkHref("MAILTO:lab@example.org")).toBe(true);
  });

  it("refuses script, data, and relative links", () => {
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkHref("data:text/html,hi")).toBe(false);
    expect(isSafeLinkHref("/cases/1")).toBe(false);
  });
});

describe("gadget nodes", () => {
  const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";
  const DASHBOARD_REF = {
    gadgetType: "dashboard",
    gadgetId: DASHBOARD_ID,
    subId: null,
  };
  const TILE_REF = {
    gadgetType: "dashboard_tile",
    gadgetId: DASHBOARD_ID,
    subId: "DataViz-1",
  };

  function _docWithInline(node: unknown): unknown {
    return { type: "doc", content: [{ type: "paragraph", content: [node] }] };
  }

  function _docWithBlock(node: unknown): unknown {
    return { type: "doc", content: [node] };
  }

  it("accepts a gadget link", () => {
    expect(
      isRichTextDocument(
        _docWithInline({ type: "gadgetLink", attrs: DASHBOARD_REF }),
      ),
    ).toBe(true);
  });

  it("accepts a gadget embed", () => {
    expect(
      isRichTextDocument(
        _docWithBlock({ type: "gadgetEmbed", attrs: TILE_REF }),
      ),
    ).toBe(true);
  });

  it("rejects a gadget link whose gadget id is not a uuid", () => {
    expect(
      isRichTextDocument(
        _docWithInline({
          type: "gadgetLink",
          attrs: { ...DASHBOARD_REF, gadgetId: "nope" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects a gadget link that stores the gadget's name", () => {
    expect(
      isRichTextDocument(
        _docWithInline({
          type: "gadgetLink",
          attrs: { ...DASHBOARD_REF, label: "Measles overview" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects a gadget embed that stores the gadget's name", () => {
    expect(
      isRichTextDocument(
        _docWithBlock({
          type: "gadgetEmbed",
          attrs: { ...TILE_REF, label: "Cases per week" },
        }),
      ),
    ).toBe(false);
  });

  it("rejects a gadget embed with content", () => {
    expect(
      isRichTextDocument(
        _docWithBlock({
          type: "gadgetEmbed",
          attrs: TILE_REF,
          content: [{ type: "text", text: "Cases per week" }],
        }),
      ),
    ).toBe(false);
  });

  it("accepts a bold gadget link", () => {
    expect(
      isRichTextDocument(
        _docWithInline({
          type: "gadgetLink",
          attrs: DASHBOARD_REF,
          marks: [{ type: "bold" }],
        }),
      ),
    ).toBe(true);
  });

  it("rejects a gadget link with a link mark that could run script", () => {
    expect(
      isRichTextDocument(
        _docWithInline({
          type: "gadgetLink",
          attrs: DASHBOARD_REF,
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        }),
      ),
    ).toBe(false);
  });

  it("writes a gadget as its type noun in plain text, never its name", () => {
    expect(
      richTextToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "See " },
              {
                type: "gadgetLink",
                attrs: {
                  gadgetType: "concept",
                  gadgetId: DASHBOARD_ID,
                  subId: null,
                },
              },
            ],
          },
          { type: "gadgetEmbed", attrs: TILE_REF },
        ],
      }),
    ).toBe("See [case type]\n[tile]");
  });

  it("writes a gadget of an unknown type as [gadget] in plain text", () => {
    expect(
      richTextToPlainText({
        type: "doc",
        content: [
          {
            type: "gadgetEmbed",
            attrs: { gadgetType: "query", gadgetId: DASHBOARD_ID, subId: null },
          },
        ],
      }),
    ).toBe("[gadget]");
  });
});
