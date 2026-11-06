import { describe, expect, it } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { render, screen } from "@/test-utils";

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
});
