import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { runFitRegression } from "./runFitRegression";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

type Row = Readonly<Record<string, unknown>>;

const QUERY_HANDLE = "query-handle-1" as QueryHandle;

const EXACT_LINE_ROWS: Row[] = [1, 2, 3, 4, 5].map((x) => {
  return { x, y: 2 * x + 1 };
});

function _makeAvandarWithRows(options: {
  rows: Row[];
  columnNames: string[];
  isTruncated?: boolean;
}): AvandarApi {
  return {
    context: {
      slotId: "agent.tool",
      queryHandle: QUERY_HANDLE,
      columns: options.columnNames.map((name) => {
        return { name, dataType: "double" as const };
      }),
      rowCount: options.rows.length,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({
          rows: options.rows,
          isTruncated: options.isTruncated ?? false,
        });
      }),
    },
    ui: {
      openModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal: vi.fn(),
    },
    dataExplorer: {
      addColumns: vi.fn(() => {
        return Promise.resolve({ columnNames: [] });
      }),
    },
    i18n: {
      t: (key) => {
        return key;
      },
    },
  };
}

const READY = _makeAvandarWithRows({
  rows: EXACT_LINE_ROWS,
  columnNames: ["x", "y"],
});

async function _getRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("runFitRegression", () => {
  it("returns the same line the button fits", async () => {
    const result = await runFitRegression(READY, {
      xColumn: "x",
      yColumn: "y",
    });
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(1);
    expect(result.rSquared).toBeCloseTo(1);
    expect(result.n).toBe(5);
    expect(result.isTruncated).toBe(false);
    expect(Object.keys(result).sort()).toEqual([
      "intercept",
      "isTruncated",
      "n",
      "rSquared",
      "slope",
    ]);
  });

  it("passes isTruncated through and asks for the two columns with no limit", async () => {
    const avandar = _makeAvandarWithRows({
      rows: EXACT_LINE_ROWS,
      columnNames: ["x", "y"],
      isTruncated: true,
    });
    const result = await runFitRegression(avandar, {
      xColumn: "x",
      yColumn: "y",
    });
    expect(result.isTruncated).toBe(true);
    expect(avandar.data.fetchRows).toHaveBeenCalledWith(QUERY_HANDLE, {
      columns: ["x", "y"],
    });
  });

  it("returns null rSquared when Y never varies", async () => {
    const result = await runFitRegression(
      _makeAvandarWithRows({
        rows: [
          { x: 1, y: 5 },
          { x: 2, y: 5 },
          { x: 3, y: 5 },
        ],
        columnNames: ["x", "y"],
      }),
      { xColumn: "x", yColumn: "y" },
    );
    expect(result.rSquared).toBeNull();
    expect(result.slope).toBe(0);
  });

  it("rejects age when the column is Age, before it fetches rows", async () => {
    const avandar = _makeAvandarWithRows({
      rows: [{ Age: 1, y: 2 }],
      columnNames: ["Age", "y"],
    });
    const error = await _getRejection(
      runFitRegression(avandar, { xColumn: "age", yColumn: "y" }),
    );
    expect(error).toBeInstanceOf(PluginError);
    expect((error as PluginError).code).toBe("InvalidToolInput");
    expect((error as PluginError).message).toBe(
      'Column "age" is not on the result.',
    );
    expect(avandar.data.fetchRows).not.toHaveBeenCalled();
  });

  it("rejects the same column", async () => {
    await expect(
      runFitRegression(READY, { xColumn: "x", yColumn: "x" }),
    ).rejects.toThrow("X and Y are the same column.");
  });

  it("rejects too little numeric data", async () => {
    const error = await _getRejection(
      runFitRegression(
        _makeAvandarWithRows({
          rows: [{ x: 1, y: 1 }],
          columnNames: ["x", "y"],
        }),
        { xColumn: "x", yColumn: "y" },
      ),
    );
    expect((error as PluginError).code).toBe("InvalidToolInput");
    expect((error as PluginError).message).toBe(
      "Not enough numeric rows to fit a line.",
    );
  });
});
