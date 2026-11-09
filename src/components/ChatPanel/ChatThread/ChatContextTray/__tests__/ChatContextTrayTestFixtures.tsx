import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatContextTray } from "@/components/ChatPanel/ChatThread/ChatContextTray/ChatContextTray";
import { fireEvent, render, screen } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { GadgetSummary } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    searchGadgets: vi.fn(),
    useChatContextPageRefs: vi.fn(),
    summariesByKey: new Map<string, unknown>(),
  };
});

/** The mocked search and page refs, for a test to set up or inspect. */
export const trayMocks = mocks;

vi.mock("@/clients/gadgets/searchGadgets/searchGadgets", () => {
  return { searchGadgets: mocks.searchGadgets };
});

vi.mock(
  "@/components/ChatPanel/ChatThread/ChatContextTray/useChatContextPageRefs",
  () => {
    return { useChatContextPageRefs: mocks.useChatContextPageRefs };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "33333333-3333-4333-8333-333333333333" };
    },
  };
});

// Every type's summary reads the same table, keyed by the ref.
vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const useSummary = (ref: Gadget.Ref) => {
      const key = `${ref.gadgetType}:${ref.gadgetId}:${ref.subId ?? ""}`;
      return mocks.summariesByKey.get(key) ?? { status: "unavailable" };
    };
    return {
      useDashboardSummary: useSummary,
      useDashboardTileSummary: useSummary,
      useDatasetSummary: useSummary,
      useMapSummary: useSummary,
      useConceptSummary: useSummary,
      useIndividualSummary: useSummary,
    };
  },
);

// A chip links with `Link`, which needs a router; a plain anchor will do.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => {
      const {
        params: _params,
        search: _search,
        ...anchorProps
      } = rest as Record<string, unknown>;
      return createElement("a", { href: to, ...anchorProps }, children);
    },
  };
});

export const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  subId: null,
};

export const TILE_REF: Gadget.Ref = {
  gadgetType: "dashboard_tile",
  gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  subId: "DataViz-weekly",
};

export const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  subId: null,
};

export const MAP_REF: Gadget.Ref = {
  gadgetType: "map",
  gadgetId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  subId: null,
};

/** A dataset ref numbered `index`, for filling the tray. */
export function buildDatasetRef(index: number): Gadget.Ref {
  return {
    gadgetType: "dataset",
    gadgetId: `00000000-0000-4000-8000-00000000000${index}`,
    subId: null,
  };
}

/** Makes a ref's summary available under `name`. */
export function setAvailableSummary(ref: Gadget.Ref, name: string): void {
  const summary: GadgetSummary = {
    status: "available",
    name,
    facts: [],
    link: { to: "/$workspaceSlug/dashboards", params: {} },
  };
  mocks.summariesByKey.set(ChatMentionToken.buildRefKey(ref), summary);
}

/** Makes a ref's summary report that it is still loading. */
export function setLoadingSummary(ref: Gadget.Ref): void {
  mocks.summariesByKey.set(ChatMentionToken.buildRefKey(ref), {
    status: "loading",
  });
}

/** A search result for `ref`, labeled `label`. */
export function buildSearchResult(
  ref: Gadget.Ref,
  label: string,
  subLabel?: string,
): GadgetSearchResult {
  return { ref, label, subLabel, hasLimitedAudience: false };
}

beforeEach(() => {
  mocks.searchGadgets.mockReset();
  mocks.searchGadgets.mockResolvedValue([]);
  mocks.useChatContextPageRefs.mockReset();
  mocks.useChatContextPageRefs.mockReturnValue([]);
  mocks.summariesByKey.clear();
  setAvailableSummary(DASHBOARD_REF, "Measles by borough");
  setAvailableSummary(TILE_REF, "Weekly cases");
  setAvailableSummary(DATASET_REF, "US deaths");
  setAvailableSummary(MAP_REF, "Outbreak map");
});

/** Renders the tray holding `contextTray`, with this page's `pageRefs`. */
export function renderTray(
  options: {
    contextTray?: readonly Gadget.Ref[];
    pageRefs?: readonly Gadget.Ref[];
  } = {},
): void {
  mocks.useChatContextPageRefs.mockReturnValue(options.pageRefs ?? []);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const initialState: ReturnType<typeof ChatPanelStateManager.useState> = {
    isOpen: true,
    isAvailable: true,
    layout: "docked",
    caseDesignSessionNonce: 0,
    pendingClarification: undefined,
    pendingCaseTypeDraft: undefined,
    contextTray: options.contextTray ?? [],
  };
  render(
    <QueryClientProvider client={queryClient}>
      <ChatPanelStateManager.Provider initialStateOverrides={initialState}>
        <ChatContextTray />
      </ChatPanelStateManager.Provider>
    </QueryClientProvider>,
  );
}

/** Opens the picker and waits for its search box. */
export async function openPicker(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "Add context" }));
  return await screen.findByRole("textbox", {
    name: "Search dashboards, datasets, maps...",
  });
}
