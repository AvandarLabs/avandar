import { afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Editor } from "@tiptap/core";
import type { ComponentProps } from "react";

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

// The gadget actions menu builds absolute links from the router, which a
// composer rendered outside a `RouterProvider` does not have.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouter: () => {
      return {
        buildLocation: () => {
          return { href: "/nyc-doh/dashboards/preview/dashboard" };
        },
      };
    },
  };
});

// ProseMirror scrolls the selection into view on a later animation frame
// after `focus()`, measuring it with `getClientRects`, which jsdom does not
// implement on ranges or elements. A real browser always has both.
beforeAll(() => {
  const emptyRects = (): DOMRectList => {
    const noRect = (): null => {
      return null;
    };
    return Object.assign([], { item: noRect }) as unknown as DOMRectList;
  };
  const emptyRect = (): DOMRect => {
    return new DOMRect(0, 0, 0, 0);
  };
  Range.prototype.getClientRects ??= emptyRects;
  Range.prototype.getBoundingClientRect ??= emptyRect;
  Element.prototype.getClientRects ??= emptyRects;
});

beforeEach(() => {
  mocks.searchGadgets.mockReset();
  mocks.searchGadgets.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

const DOCUMENT = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Lab results are in" }],
    },
  ],
};

const PRIYA_ID = "11111111-1111-4111-8111-111111111111";
const PRISCILLA_ID = "22222222-2222-4222-8222-222222222222";

const CANDIDATES: MentionCandidate[] = [
  {
    userId: PRIYA_ID,
    displayName: "Priya Natarajan",
    email: "priya.n@example.org",
  },
  {
    userId: PRISCILLA_ID,
    displayName: "Priscilla Owusu",
    email: "p.owusu@example.org",
  },
];

function _renderComposer(
  props: Partial<ComponentProps<typeof RichTextComposer>> = {},
): void {
  render(
    <RichTextComposer
      label="Write an update"
      placeholder="Write an update"
      initialContent={DOCUMENT}
      mentionCandidates={CANDIDATES}
      submitLabel="Post"
      isSubmitting={false}
      onSubmit={vi.fn().mockResolvedValue(true)}
      {...props}
    />,
  );
}

function _getEditingArea(): HTMLElement {
  // Found by name alone: its role is `textbox`, or `combobox` while the
  // mention list is open.
  return screen.getByLabelText("Write an update");
}

function _getEditor(): Editor {
  return (_getEditingArea() as HTMLElement & { editor: Editor }).editor;
}

function _pressModEnter(): void {
  // ProseMirror maps `Mod` to Control outside macOS, which jsdom reports.
  fireEvent.keyDown(_getEditingArea(), { key: "Enter", ctrlKey: true });
}

function _paragraphDocument(text: string): RichTextDocument.T {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const DASHBOARD_ID = "44444444-4444-4444-8444-444444444444";

const MEASLES_DASHBOARD: GadgetSearchResult = {
  ref: { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null },
  label: "Measles by borough",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const GADGET_ATTRS_JSON = `{"gadgetType":"dashboard","gadgetId":"${DASHBOARD_ID}","subId":null}`;

/** Types `@meas` in an empty composer and waits for the dashboard row. */
async function _openGadgetMenu(
  onSubmit: ComponentProps<typeof RichTextComposer>["onSubmit"],
): Promise<void> {
  mocks.searchGadgets.mockResolvedValue([MEASLES_DASHBOARD]);
  _renderComposer({
    onSubmit,
    initialContent: undefined,
    workspaceId: WORKSPACE_ID,
  });
  act(() => {
    _getEditor().commands.insertContent("@meas");
  });
  expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
  // The insert command collapses the DOM selection, and jsdom throws on
  // that when no range exists, unlike a real browser.
  window.getSelection()?.selectAllChildren(_getEditingArea());
}

async function _postAndGetCall(
  onSubmit: ReturnType<typeof vi.fn>,
): Promise<[RichTextDocument.T, string]> {
  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalled();
  });
  return onSubmit.mock.calls[0] as [RichTextDocument.T, string];
}

type PendingSearch = {
  params: { workspaceId: string; query: string; signal?: AbortSignal };
  resolve: (results: GadgetSearchResult[]) => void;
};

const MEXICO_DASHBOARD: GadgetSearchResult = {
  ...MEASLES_DASHBOARD,
  ref: { ...MEASLES_DASHBOARD.ref, gadgetId: WORKSPACE_ID },
  label: "Mexico imports",
};

/** Makes every gadget search wait until the test resolves it. */
function _holdGadgetSearches(): PendingSearch[] {
  const pendingSearches: PendingSearch[] = [];
  mocks.searchGadgets.mockImplementation((params: PendingSearch["params"]) => {
    return new Promise<GadgetSearchResult[]>((resolve) => {
      pendingSearches.push({ params, resolve });
    });
  });
  return pendingSearches;
}

/** Moves the faked clock and lets the editor and React settle. */
async function _advanceTime(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function _type(text: string): Promise<void> {
  act(() => {
    _getEditor().commands.insertContent(text);
  });
  await _advanceTime(0);
}

/** Renders a composer with a workspace on a faked clock. */
function _renderTimedComposer(
  props: Partial<ComponentProps<typeof RichTextComposer>> = {},
): void {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  _renderComposer({
    initialContent: undefined,
    workspaceId: WORKSPACE_ID,
    ...props,
  });
}

export const RichTextComposerTestFixtures = {
  RichTextComposer,
  mocks,
  DOCUMENT,
  PRIYA_ID,
  PRISCILLA_ID,
  CANDIDATES,
  WORKSPACE_ID,
  DASHBOARD_ID,
  MEASLES_DASHBOARD,
  MEXICO_DASHBOARD,
  GADGET_ATTRS_JSON,
  _renderComposer,
  _getEditingArea,
  _getEditor,
  _pressModEnter,
  _paragraphDocument,
  _openGadgetMenu,
  _postAndGetCall,
  _holdGadgetSearches,
  _advanceTime,
  _type,
  _renderTimedComposer,
};
