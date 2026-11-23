import { describe, expect, it, vi } from "vitest";
import { RichTextMembersContext } from "@/components/RichText/RichTextMembersContext";
import { RichTextView } from "@/components/RichText/RichTextView/RichTextView";
import { render, screen } from "@/test-utils";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { ReactNode } from "react";

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: () => {
        return {
          status: "available",
          name: "Measles by borough",
          facts: [],
          link: {
            to: "/$workspaceSlug/dashboards/preview/$dashboardId",
            params: { workspaceSlug: "nyc-doh", dashboardId: GADGET_ID },
          },
        };
      },
      useDashboardTileSummary: unavailable,
      useDatasetSummary: unavailable,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

// A plain anchor, so the view renders without a router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params: _params,
      search: _search,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
      search?: Record<string, string>;
    }) => {
      return createElement("a", { href: to, ...rest }, children);
    },
  };
});

const GADGET_ID = "22222222-2222-4222-8222-222222222222";

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

  it("draws a gadget link as a chip and a gadget embed as a card", () => {
    render(
      <RichTextView
        document={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "See " },
                {
                  type: "gadgetLink",
                  attrs: {
                    gadgetType: "dashboard",
                    gadgetId: GADGET_ID,
                    subId: null,
                  },
                },
              ],
            },
            {
              type: "gadgetEmbed",
              attrs: {
                gadgetType: "dashboard_tile",
                gadgetId: GADGET_ID,
                subId: "DataViz-top",
              },
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Measles by borough" }),
    ).toHaveAttribute("data-type", "gadgetLink");
    expect(
      screen.getByRole("group", { name: "Unavailable dashboard tile" }),
    ).toBeInTheDocument();
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
