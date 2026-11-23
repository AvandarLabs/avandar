import { describe, expect, it, vi } from "vitest";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

const DASHBOARD_REF = {
  gadgetType: "dashboard",
  gadgetId: DASHBOARD_ID,
  subId: null,
} as const;

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
            params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
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

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouter: () => {
      return {
        buildLocation: () => {
          return { href: `/nyc-doh/dashboards/preview/${DASHBOARD_ID}` };
        },
      };
    },
  };
});

function _renderComposer(
  onChange: (document: RichTextDocument.T) => void,
): void {
  render(
    <RichTextComposer
      label="Write an update"
      placeholder="Write an update"
      initialContent={{
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "See " },
              { type: "gadgetLink", attrs: DASHBOARD_REF },
            ],
          },
        ],
      }}
      mentionCandidates={[]}
      submitLabel="Post"
      isSubmitting={false}
      onSubmit={vi.fn()}
      onChange={onChange}
    />,
  );
}

describe("switching a gadget's display in the composer", () => {
  it("turns a chip into a selected card through the chip's menu", async () => {
    const onChange = vi.fn();
    _renderComposer(onChange);
    const editingArea = screen.getByRole("textbox", {
      name: "Write an update",
    });
    // jsdom needs a DOM selection inside the editor before it can focus it.
    window.getSelection()?.selectAllChildren(editingArea);

    fireEvent.click(
      await screen.findByRole("button", { name: "Measles by borough" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Show as embed",
        hidden: true,
      }),
    );

    const card = await screen.findByRole("group", {
      name: "Measles by borough",
    });
    expect(onChange).toHaveBeenLastCalledWith({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "See " }] },
        { type: "gadgetEmbed", attrs: DASHBOARD_REF },
        // The editor keeps a paragraph after a trailing block to type into.
        { type: "paragraph" },
      ],
    });
    await waitFor(() => {
      expect(card.closest(".ProseMirror-selectednode")).not.toBeNull();
    });
    expect(
      screen.queryByRole("link", { name: "Open Measles by borough" }),
    ).not.toBeInTheDocument();
  });
});
