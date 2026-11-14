import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  CROSSWALK_ID,
  makeAddedState,
  makeSeededState,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { CrosswalkFlowView } from "@/views/DataManagerApp/CrosswalkView/CrosswalkFlowView/CrosswalkFlowView";

const mocks = vi.hoisted(() => {
  return { search: {} as Record<string, unknown>, navigate: vi.fn() };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useSearch: () => {
      return mocks.search;
    },
    useNavigate: () => {
      return mocks.navigate;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
// Imported inside the factory: a hoisted factory must not read a top-level
// import.
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useCrosswalkCatalog/useCrosswalkCatalog",
  async () => {
    const fixtures =
      await import("@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures");
    return { useCrosswalkCatalog: fixtures.makeCrosswalkCatalog };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useSaveCrosswalk/useSaveCrosswalk",
  () => {
    return {
      useSaveCrosswalk: () => {
        return [
          vi.fn(() => {
            return Promise.resolve(true);
          }),
          false,
        ];
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkHeader",
  () => {
    return {
      CrosswalkHeader: () => {
        return <header>Crosswalk header</header>;
      },
    };
  },
);

describe("CrosswalkFlowView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = {};
  });

  it("opens a new crosswalk on Choose datasets", () => {
    const { container } = render(
      <CrosswalkFlowView
        crosswalk={undefined}
        initialDraft={makeAddedState().draft}
        isSaved={false}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Choose datasets" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-crosswalk-step="datasets"]'),
    ).not.toBeNull();
  });

  it("opens the step in the URL and moves between reachable steps", () => {
    mocks.search = { step: "map" };
    const { container } = render(
      <CrosswalkFlowView
        crosswalk={undefined}
        initialDraft={makeSeededState().draft}
        isSaved
      />,
    );

    expect(
      container.querySelector('[data-crosswalk-step="map"]'),
    ).not.toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Create combined dataset/ }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { workspaceSlug: "demo", crosswalkId: CROSSWALK_ID },
        search: { step: "combine", layoutId: undefined },
      }),
    );
  });

  it("names the last step Update once the crosswalk has a combined dataset", () => {
    const draft = {
      ...makeSeededState().draft,
      outputDatasetId: makeAddedState().draft.layouts[0]?.datasetIds[0],
    };
    render(
      <CrosswalkFlowView crosswalk={undefined} initialDraft={draft} isSaved />,
    );

    expect(
      screen.getByRole("button", { name: /Update combined dataset/ }),
    ).toBeInTheDocument();
  });
});
