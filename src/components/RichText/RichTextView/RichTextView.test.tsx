import { describe, expect, it } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { render, screen } from "@/test-utils";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

describe("RichTextView", () => {
  it("renders formatting and mentions without an editor", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: () => {
            return "Dana Whitfield";
          },
        }}
      >
        <RichTextView
          document={{
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "userMention",
                    attrs: { id: "11111111-1111-4111-8111-111111111111" },
                  },
                  { type: "text", text: " rash onset " },
                  { type: "text", text: "Oct 24", marks: [{ type: "bold" }] },
                ],
              },
            ],
          }}
        />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.getByText("@Dana Whitfield")).toBeInTheDocument();
    expect(screen.getByText("Oct 24").tagName).toBe("STRONG");
  });

  it("falls back to plain text for a node it does not know", () => {
    render(
      <RichTextView
        document={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "objectEmbed",
                  content: [{ type: "text", text: "Dashboard" }],
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("names mentioned members in the plain text fallback", () => {
    render(
      <RichTextMembersContext.Provider
        value={{
          getMemberName: (userId) => {
            return userId === MEMBER_ID ? "Dana Whitfield" : undefined;
          },
        }}
      >
        <RichTextView document={_documentWithEmbedAndMention(MEMBER_ID)} />
      </RichTextMembersContext.Provider>,
    );
    expect(screen.getByText(/@Dana Whitfield/)).toBeInTheDocument();
  });

  it("calls a departed member a former member in the plain text fallback", () => {
    render(<RichTextView document={_documentWithEmbedAndMention(MEMBER_ID)} />);
    expect(screen.getByText(/@Former member/)).toBeInTheDocument();
  });
});

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";

function _documentWithEmbedAndMention(userId: string): RichTextDocument.T {
  return {
    type: "doc",
    content: [
      { type: "objectEmbed" },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Ask " },
          { type: "userMention", attrs: { id: userId } },
        ],
      },
    ],
  };
}
