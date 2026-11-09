import { EditorContent, useEditor } from "@tiptap/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { createMentionMenuSuggestion } from "./createMentionMenuSuggestion";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { Editor } from "@tiptap/core";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { searchGadgets: vi.fn() };
});

vi.mock("@/clients/gadgets/searchGadgets/searchGadgets", () => {
  return { searchGadgets: mocks.searchGadgets };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: unavailable,
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
          return { href: "/nyc-doh/datasets/preview" };
        },
      };
    },
  };
});

// jsdom implements none of the geometry ProseMirror measures after a focus.
beforeAll(() => {
  const emptyRects = (): DOMRectList => {
    const noRect = (): null => {
      return null;
    };
    return Object.assign([], { item: noRect }) as unknown as DOMRectList;
  };
  Range.prototype.getClientRects ??= emptyRects;
  Range.prototype.getBoundingClientRect ??= () => {
    return new DOMRect(0, 0, 0, 0);
  };
  Element.prototype.getClientRects ??= emptyRects;
});

const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";

const DATASET: GadgetSearchResult = {
  ref: {
    gadgetType: "dataset",
    gadgetId: "22222222-2222-4222-8222-222222222222",
    subId: null,
  },
  label: "Borough boundaries",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const INDIVIDUAL: GadgetSearchResult = {
  ref: {
    gadgetType: "individual",
    gadgetId: "55555555-5555-4555-8555-555555555555",
    subId: null,
  },
  label: "Case of Amara Okafor",
  subLabel: undefined,
  hasLimitedAudience: false,
};

let currentEditor: Editor | null = null;

function ChatMentionEditor(): ReactNode {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: createRichTextExtensions({
      mentionSuggestion: createMentionMenuSuggestion({
        variant: "chat",
        getWorkspaceId: () => {
          return WORKSPACE_ID;
        },
      }),
    }),
  });
  currentEditor = editor;
  return <EditorContent editor={editor} />;
}

function _getEditor(): Editor {
  if (!currentEditor) {
    throw new Error("the editor is not mounted");
  }
  return currentEditor;
}

async function _openMenuWithResults(
  results: GadgetSearchResult[],
): Promise<void> {
  mocks.searchGadgets.mockResolvedValue(results);
  render(<ChatMentionEditor />);
  await waitFor(() => {
    expect(currentEditor).not.toBeNull();
  });
  act(() => {
    _getEditor().commands.insertContent("@bor");
  });
  expect(await screen.findByText("Borough boundaries")).toBeInTheDocument();
  // The insert command collapses the DOM selection, and jsdom throws on
  // that when no range exists, unlike a real browser.
  window.getSelection()?.selectAllChildren(_getEditor().view.dom);
}

beforeEach(() => {
  currentEditor = null;
  mocks.searchGadgets.mockReset();
});

afterEach(() => {
  currentEditor = null;
});

describe("createMentionMenuSuggestion, chat variant", () => {
  it("offers no people", () => {
    const suggestion = createMentionMenuSuggestion({
      variant: "chat",
      getWorkspaceId: () => {
        return "ws";
      },
    });

    const items = suggestion?.items?.({
      query: "",
      editor: {} as Editor,
    });

    expect(items).toEqual([]);
  });

  it("drops cases from search results and keeps the full search limit", async () => {
    await _openMenuWithResults([DATASET, INDIVIDUAL]);

    expect(screen.getByText("Borough boundaries")).toBeInTheDocument();
    expect(screen.queryByText("Case of Amara Okafor")).toBeNull();
    expect(mocks.searchGadgets).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 30 }),
    );
  });

  it("inserts a link on Enter", async () => {
    await _openMenuWithResults([DATASET]);

    fireEvent.keyDown(_getEditor().view.dom, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    const json = JSON.stringify(_getEditor().getJSON());
    expect(json).toContain('"type":"gadgetLink"');
    expect(json).not.toContain("gadgetEmbed");
  });

  it("inserts a link, not an embed, on Shift+Enter", async () => {
    await _openMenuWithResults([DATASET]);

    fireEvent.keyDown(_getEditor().view.dom, { key: "Enter", shiftKey: true });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
    });
    const json = JSON.stringify(_getEditor().getJSON());
    expect(json).toContain('"type":"gadgetLink"');
    expect(json).not.toContain("gadgetEmbed");
  });

  it("shows only the Enter key hint in the footer", async () => {
    await _openMenuWithResults([DATASET]);

    expect(await screen.findByText("Enter")).toBeInTheDocument();
    expect(screen.queryByText(/embed/)).toBeNull();
  });
});
