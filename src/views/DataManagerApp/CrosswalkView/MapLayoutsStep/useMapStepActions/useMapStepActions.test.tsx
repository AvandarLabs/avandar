import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import {
  BRONX_LAYOUT_ID,
  makeDraft,
  makeFlow,
  QUEENS_LAYOUT_ID,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { useMapStepActions } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useMapStepActions/useMapStepActions";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { MapStepActions } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/useMapStepActions/useMapStepActions";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";

function _withStatus(
  layoutId: string,
  status: CrosswalkDraft.Layout["status"],
): CrosswalkDraft.T {
  const draft = makeDraft();
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return layout.id === layoutId ? { ...layout, status } : layout;
    }),
  };
}

async function _run(
  flow: CrosswalkFlow,
  run: (actions: MapStepActions) => Promise<void>,
): Promise<void> {
  const { result } = renderHook(() => {
    return useMapStepActions(flow);
  });
  await act(async () => {
    await run(result.current);
  });
}

describe("useMapStepActions", () => {
  it("confirms a layout through the flow's save, then selects the next one to map", async () => {
    const flow = makeFlow();

    await _run(flow, (actions) => {
      return actions.confirmAndNext(QUEENS_LAYOUT_ID);
    });

    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "layout_confirmed",
      layoutId: QUEENS_LAYOUT_ID,
    });
    expect(flow.dispatch).not.toHaveBeenCalled();
    expect(flow.selectLayout).toHaveBeenCalledWith(BRONX_LAYOUT_ID);
    expect(flow.goToStep).not.toHaveBeenCalled();
  });

  it("skips the last layout left to map, then goes to step 3", async () => {
    const flow = makeFlow(_withStatus(QUEENS_LAYOUT_ID, "mapped"));

    await _run(flow, (actions) => {
      return actions.skip(BRONX_LAYOUT_ID);
    });

    expect(flow.dispatchAndSave).toHaveBeenCalledWith({
      type: "layout_skipped",
      layoutId: BRONX_LAYOUT_ID,
    });
    expect(flow.selectLayout).not.toHaveBeenCalled();
    expect(flow.goToStep).toHaveBeenCalledWith("combine");
  });

  it("stays on the layout when the save fails", async () => {
    const flow = makeFlow(makeDraft(), {
      dispatchAndSave: vi.fn(() => {
        return Promise.resolve(false);
      }),
    });

    await _run(flow, (actions) => {
      return actions.confirmAndNext(QUEENS_LAYOUT_ID);
    });

    expect(flow.selectLayout).not.toHaveBeenCalled();
    expect(flow.goToStep).not.toHaveBeenCalled();
  });

  it("accepts every suggestion, or reopens a skipped layout, and stays", async () => {
    const flow = makeFlow(_withStatus(BRONX_LAYOUT_ID, "skipped"));

    await _run(flow, async (actions) => {
      await actions.acceptAll(QUEENS_LAYOUT_ID);
      await actions.reopen(BRONX_LAYOUT_ID);
    });

    expect(flow.dispatchAndSave).toHaveBeenNthCalledWith(1, {
      type: "suggestions_accepted",
      layoutId: QUEENS_LAYOUT_ID,
    });
    expect(flow.dispatchAndSave).toHaveBeenNthCalledWith(2, {
      type: "layout_reopened",
      layoutId: BRONX_LAYOUT_ID,
    });
    expect(flow.selectLayout).not.toHaveBeenCalled();
    expect(flow.goToStep).not.toHaveBeenCalled();
  });
});
