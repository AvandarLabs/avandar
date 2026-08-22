/**
 * `query.ran` separates deliberate runs from incidental ones, and the whole
 * separation rests on the state manager stamping the right trigger. Manual
 * form edits must stamp themselves; every other origin stamps explicitly.
 *
 * This drives the real `DataExplorerStateManager` through its `Provider` and
 * `useContext`, rather than re-implementing the reducer locally the way
 * `DataExplorerStateManager.test.ts` does, so a break in the actual action
 * wiring is caught here.
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _wrapper },
  );
}

describe("Data Explorer query trigger", () => {
  it("stamps a structured change when the manual form edits the query", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setQueryTrigger("chat_generated");
    });
    act(() => {
      result.current[1].setLimit(100);
    });

    expect(result.current[0].queryTrigger).toBe("structured_change");
    expect(result.current[0].query.limit).toBe(100);
  });

  it("keeps an explicit trigger when raw SQL is set", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setQueryTrigger("sql_submit");
    });
    act(() => {
      result.current[1].setRawSql("SELECT 1");
    });

    expect(result.current[0].queryTrigger).toBe("sql_submit");
    expect(result.current[0].rawSql).toBe("SELECT 1");
  });

  it("resets the trigger when the explorer is reset", () => {
    const { result } = _renderStateManager();

    // An untouched form is a structured change, so moving away from that value
    // and back is what makes the reset observable.
    expect(result.current[0].queryTrigger).toBe("structured_change");

    act(() => {
      result.current[1].setQueryTrigger("dataset_opened");
    });
    act(() => {
      result.current[1].resetState();
    });

    expect(result.current[0].queryTrigger).toBe("structured_change");
  });

  it("lets a stamp dispatched after manual-form actions in the same render win", () => {
    const { result } = _renderStateManager();

    // URL hydration restores the structured query first, and each of those
    // restores stamps `structured_change`. It stamps its own origin last,
    // inside the same synchronous block, so React coalesces the whole set
    // into one render and no query ever observes an intermediate value.
    act(() => {
      result.current[1].setLimit(100);
      result.current[1].setQueryTrigger("url_hydration");
    });

    expect(result.current[0].queryTrigger).toBe("url_hydration");
    expect(result.current[0].query.limit).toBe(100);
  });
});
