import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import {
  CROSSWALK_ID,
  getLayoutOf,
  KINGS_MARCH,
  makeAddedState,
  makeSeededState,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { isCrosswalkDirty } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import { useCrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkAction } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

const mocks = vi.hoisted(() => {
  return {
    search: {} as Record<string, unknown>,
    navigate: vi.fn(),
    dispatch: undefined as undefined | ((action: CrosswalkAction) => void),
    isSaveRefused: false,
    savedDrafts: [] as CrosswalkDraft.T[],
  };
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
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useSaveCrosswalk/useSaveCrosswalk",
  () => {
    return {
      useSaveCrosswalk: (dispatch: (action: CrosswalkAction) => void) => {
        mocks.dispatch = dispatch;
        const save = async (draft: CrosswalkDraft.T) => {
          mocks.savedDrafts.push(draft);
          if (mocks.isSaveRefused) {
            return false;
          }
          dispatch({ type: "saved", draft: { ...draft, isSaved: true } });
          return true;
        };
        return [save, false];
      },
    };
  },
);

function _renderFlow(options: { draft: CrosswalkDraft.T; isSaved: boolean }) {
  return renderHook(
    () => {
      return useCrosswalkFlow({
        crosswalkId: CROSSWALK_ID,
        initialDraft: options.draft,
        isSaved: options.isSaved,
      });
    },
    { wrapper: TestProviders },
  );
}

describe("useCrosswalkFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = {};
    mocks.isSaveRefused = false;
    mocks.savedDrafts = [];
  });

  it("opens on Choose datasets when the URL names a step not reachable yet", () => {
    mocks.search = { step: "combine" };
    const { result } = _renderFlow({
      draft: makeAddedState().draft,
      isSaved: false,
    });

    expect(result.current.step).toBe("datasets");
    expect([...result.current.reachableSteps]).toEqual(["datasets"]);
  });

  it("opens the URL's step and layout once the crosswalk can reach them", () => {
    const draft = makeSeededState().draft;
    const kingsId = getLayoutOf(makeSeededState(), KINGS_MARCH.id).id;
    mocks.search = { step: "map", layoutId: kingsId };
    const { result } = _renderFlow({ draft, isSaved: true });

    expect(result.current.step).toBe("map");
    expect(result.current.layoutId).toBe(kingsId);
    expect(result.current.reachableSteps.has("combine")).toBe(true);
  });

  it("goes to a step on the crosswalk's own URL", () => {
    const { result } = _renderFlow({
      draft: makeSeededState().draft,
      isSaved: true,
    });

    act(() => {
      result.current.goToStep("combine");
    });

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/$workspaceSlug/data-manager/crosswalks/$crosswalkId",
      params: { workspaceSlug: "demo", crosswalkId: CROSSWALK_ID },
      search: { step: "combine", layoutId: undefined },
    });
  });

  it("saves the draft after the action, then navigates from a stale closure", async () => {
    const { result } = _renderFlow({
      draft: makeSeededState().draft,
      isSaved: false,
    });
    const staleFlow = result.current;

    await act(async () => {
      await staleFlow.dispatchAndSave({ type: "renamed", name: "Renamed" });
      staleFlow.goToStep("map");
    });

    expect(mocks.savedDrafts[0]?.name).toBe("Renamed");
    expect(result.current.state.draft).toMatchObject({
      name: "Renamed",
      isSaved: true,
    });
    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { step: "map", layoutId: undefined } }),
    );
  });

  it("does not leave a new crosswalk's page before it is saved", () => {
    const { result } = _renderFlow({
      draft: makeAddedState().draft,
      isSaved: false,
    });

    act(() => {
      result.current.goToStep("map");
    });

    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("saves unsaved changes before opening another layout", async () => {
    const state = makeSeededState();
    const kingsId = getLayoutOf(state, KINGS_MARCH.id).id;
    const { result } = _renderFlow({ draft: state.draft, isSaved: true });

    await act(async () => {
      result.current.dispatch({ type: "renamed", name: "Renamed" });
    });
    await act(async () => {
      await result.current.selectLayout(kingsId);
    });

    expect(mocks.savedDrafts).toHaveLength(1);
    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { step: "map", layoutId: kingsId } }),
    );
  });

  it("still opens the layout when that save fails, keeping the changes unsaved", async () => {
    mocks.isSaveRefused = true;
    const state = makeSeededState();
    const kingsId = getLayoutOf(state, KINGS_MARCH.id).id;
    const { result } = _renderFlow({ draft: state.draft, isSaved: true });

    await act(async () => {
      result.current.dispatch({ type: "renamed", name: "Renamed" });
    });
    await act(async () => {
      await result.current.selectLayout(kingsId);
    });

    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { step: "map", layoutId: kingsId } }),
    );
    expect(isCrosswalkDirty(result.current.state)).toBe(true);
  });

  it("opens another layout without saving when nothing changed", async () => {
    const state = makeSeededState();
    const { result } = _renderFlow({ draft: state.draft, isSaved: true });

    await act(async () => {
      await result.current.selectLayout(getLayoutOf(state, KINGS_MARCH.id).id);
    });

    expect(mocks.savedDrafts).toHaveLength(0);
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
  });
});
