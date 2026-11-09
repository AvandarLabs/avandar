import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { addColumnsForInvocation } from "@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  DataExplorerToolbarContext,
  DerivedColumn,
  QueryHandle,
} from "@avandar/plugin-sdk";

const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "handle" as QueryHandle,
  columns: [
    { name: "cases", dataType: "bigint" },
    { name: "rate", dataType: "double" },
  ],
  rowCount: 2,
};

const RATE_COLUMN: DerivedColumn = {
  name: "rate",
  expression: "{cases} * 2",
  inputs: { cases: "cases" },
};

function _makeBridge(
  options: Readonly<{ baseSql?: string | undefined; isApplied?: boolean }> = {},
): DataExplorerBridge & {
  applyDerivedColumnsSql: ReturnType<typeof vi.fn>;
} {
  return {
    baseSql: "baseSql" in options ? options.baseSql : `SELECT * FROM "t"`,
    applyDerivedColumnsSql: vi.fn(() => {
      return options.isApplied ?? true;
    }),
  };
}

/**
 * The `PluginError` code `addColumnsForInvocation` throws with `bridge`,
 * undefined when it does not throw.
 */
function _getThrownCode(options: {
  bridge: DataExplorerBridge;
  columns?: readonly DerivedColumn[];
}): string | undefined {
  try {
    addColumnsForInvocation({
      context: CONTEXT,
      bridge: options.bridge,
      columns: options.columns ?? [RATE_COLUMN],
    });
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("addColumnsForInvocation", () => {
  it("applies the wrapped base SQL through the bridge", () => {
    const bridge = _makeBridge();

    addColumnsForInvocation({
      context: CONTEXT,
      bridge,
      columns: [RATE_COLUMN],
    });

    expect(bridge.applyDerivedColumnsSql).toHaveBeenCalledWith({
      sql: expect.stringContaining(`SELECT * FROM "t"\n`),
      columnNames: ["rate_2"],
    });
  });

  it("names the columns after the invoked-on result's columns", () => {
    const result = addColumnsForInvocation({
      context: CONTEXT,
      bridge: _makeBridge(),
      columns: [RATE_COLUMN],
    });

    expect(result.columnNames).toEqual(["rate_2"]);
  });

  it("throws InvalidHandle when the explorer has no SQL", () => {
    expect(
      _getThrownCode({ bridge: _makeBridge({ baseSql: undefined }) }),
    ).toBe("InvalidHandle");
  });

  it("throws InvalidHandle when the explorer no longer shows the result", () => {
    expect(_getThrownCode({ bridge: _makeBridge({ isApplied: false }) })).toBe(
      "InvalidHandle",
    );
  });

  it("applies nothing when a column is invalid", () => {
    const bridge = _makeBridge();

    const code = _getThrownCode({
      bridge,
      columns: [{ ...RATE_COLUMN, inputs: { cases: "deaths" } }],
    });

    expect(code).toBe("InvalidExpression");
    expect(bridge.applyDerivedColumnsSql).not.toHaveBeenCalled();
  });
});
