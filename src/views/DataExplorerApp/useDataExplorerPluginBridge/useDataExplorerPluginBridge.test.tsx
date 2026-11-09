import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it } from "vitest";
import {
  TestProviders,
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useDataExplorerPluginBridge } from "@/views/DataExplorerApp/useDataExplorerPluginBridge/useDataExplorerPluginBridge";
import type { ReactNode } from "react";

const BASE_SQL = `SELECT "borough", "cases" FROM "nyc"`;
const WRAPPED_SQL = `WITH ava_source AS (SELECT 1) SELECT * FROM ava_source`;
const COLUMN_NAMES = ["double_cases"];

type HookProps = { executedSql: string | undefined };

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <TestProviders>
      <DataExplorerStateManager.Provider>
        {children}
      </DataExplorerStateManager.Provider>
    </TestProviders>
  );
}

/**
 * Renders the hook beside the explorer state it reads and writes, starting
 * from `executedSql`.
 */
function _renderBridgeHook(executedSql: string | undefined) {
  return renderHook(
    (props: HookProps) => {
      return {
        getBridge: useDataExplorerPluginBridge(props),
        state: DataExplorerStateManager.useState(),
        dispatch: DataExplorerStateManager.useDispatch(),
      };
    },
    { wrapper: _wrapper, initialProps: { executedSql } },
  );
}

type BridgeHookResult = ReturnType<typeof _renderBridgeHook>;

/** Renders the hook on an explorer whose SQL is `BASE_SQL`, as after a run. */
function _renderBridge(): BridgeHookResult {
  const rendered = _renderBridgeHook(BASE_SQL);
  act(() => {
    rendered.result.current.dispatch.setRawSql(BASE_SQL);
  });
  return rendered;
}

function _applyWrappedSql(rendered: BridgeHookResult): boolean {
  const bridge = rendered.result.current.getBridge?.();
  let isApplied = false;
  act(() => {
    isApplied =
      bridge?.applyDerivedColumnsSql({
        sql: WRAPPED_SQL,
        columnNames: COLUMN_NAMES,
      }) ?? false;
  });
  return isApplied;
}

describe("useDataExplorerPluginBridge", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      notifications.clean();
    });
  });

  it("offers no bridge while there is no result", () => {
    const { result } = _renderBridgeHook(undefined);

    expect(result.current.getBridge).toBeUndefined();
  });

  it("gives the bridge the SQL of the result on screen when it is built", () => {
    const rendered = _renderBridge();

    expect(rendered.result.current.getBridge?.().baseSql).toBe(BASE_SQL);
  });

  it("applies the SQL when the explorer still shows the invoked-on result", () => {
    const rendered = _renderBridge();

    const isApplied = _applyWrappedSql(rendered);

    expect(isApplied).toBe(true);
    expect(rendered.result.current.state.rawSql).toBe(WRAPPED_SQL);
  });

  it("changes nothing when the explorer shows a newer result", () => {
    const rendered = _renderBridge();
    const bridge = rendered.result.current.getBridge?.();
    rendered.rerender({ executedSql: `SELECT "cases" FROM "nyc"` });

    let isApplied = true;
    act(() => {
      isApplied =
        bridge?.applyDerivedColumnsSql({
          sql: WRAPPED_SQL,
          columnNames: COLUMN_NAMES,
        }) ?? true;
    });

    expect(isApplied).toBe(false);
    expect(rendered.result.current.state.rawSql).toBe(BASE_SQL);
  });

  it("lists the added columns in a notification", async () => {
    const rendered = _renderBridge();

    _applyWrappedSql(rendered);

    expect(await screen.findByText("Added double_cases")).toBeInTheDocument();
  });

  it("puts the earlier SQL back when Undo is clicked", async () => {
    const rendered = _renderBridge();
    _applyWrappedSql(rendered);

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(rendered.result.current.state.rawSql).toBe(BASE_SQL);
  });

  it("warns and keeps the newer SQL when Undo comes after another change", async () => {
    const rendered = _renderBridge();
    _applyWrappedSql(rendered);
    act(() => {
      rendered.result.current.dispatch.setRawSql("SELECT 2");
    });

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.getByText("Nothing to undo")).toBeInTheDocument();
    });
    expect(rendered.result.current.state.rawSql).toBe("SELECT 2");
  });
});
