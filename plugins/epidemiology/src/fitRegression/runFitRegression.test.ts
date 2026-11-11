import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { runFitRegression, runFitRegressionTool } from "./runFitRegression";
import type {
  AvandarApi,
  PluginColumnDataType,
  QueryHandle,
} from "@avandar/plugin-sdk";

type Row = Readonly<Record<string, unknown>>;

const QUERY_HANDLE = "query-handle-1" as QueryHandle;

const EXACT_LINE_ROWS: Row[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => {
  return { x, y: 2 * x + 1 };
});

function _makeAvandarWithRows(options: {
  rows: Row[];
  columnNames: string[];
  isTruncated?: boolean;
  dataTypes?: Readonly<Record<string, PluginColumnDataType>>;
}): AvandarApi {
  return {
    context: {
      slotId: "agent.tool",
      queryHandle: QUERY_HANDLE,
      columns: options.columnNames.map((name) => {
        return { name, dataType: options.dataTypes?.[name] ?? "double" };
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

async function _getRejection(outcome: unknown): Promise<unknown> {
  try {
    await outcome;
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
    expect(result.n).toBe(10);
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
        rows: EXACT_LINE_ROWS.map((row) => {
          return { ...row, y: 5 };
        }),
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
      "At least 10 rows need a number in both columns to fit a line.",
    );
  });

  it("rejects a fit over 9 rows, which would let the line give rows away", async () => {
    const error = await _getRejection(
      runFitRegression(
        _makeAvandarWithRows({
          rows: EXACT_LINE_ROWS.slice(0, 9),
          columnNames: ["x", "y"],
        }),
        { xColumn: "x", yColumn: "y" },
      ),
    );
    expect((error as PluginError).code).toBe("InvalidToolInput");
    expect((error as PluginError).message).toBe(
      "At least 10 rows need a number in both columns to fit a line.",
    );
  });

  it("counts only the rows with a number in both columns", async () => {
    const error = await _getRejection(
      runFitRegression(
        _makeAvandarWithRows({
          rows: [...EXACT_LINE_ROWS.slice(0, 9), { x: 10, y: null }],
          columnNames: ["x", "y"],
        }),
        { xColumn: "x", yColumn: "y" },
      ),
    );
    expect((error as PluginError).code).toBe("InvalidToolInput");
  });

  it("rejects a text column even when its values read as numbers, before it fetches rows", async () => {
    const avandar = _makeAvandarWithRows({
      rows: EXACT_LINE_ROWS.map((row) => {
        return { ...row, y: String(row.y) };
      }),
      columnNames: ["x", "y"],
      dataTypes: { y: "varchar" },
    });
    const error = await _getRejection(
      runFitRegression(avandar, { xColumn: "x", yColumn: "y" }),
    );
    expect((error as PluginError).code).toBe("InvalidToolInput");
    expect((error as PluginError).message).toBe(
      'Column "y" is not a number column.',
    );
    expect(avandar.data.fetchRows).not.toHaveBeenCalled();
  });

  it("fits a bigint column", async () => {
    const result = await runFitRegression(
      _makeAvandarWithRows({
        rows: EXACT_LINE_ROWS,
        columnNames: ["x", "y"],
        dataTypes: { x: "bigint" },
      }),
      { xColumn: "x", yColumn: "y" },
    );
    expect(result.n).toBe(10);
  });

  it("does not look up a non-string column through String(value)", async () => {
    const avandar = _makeAvandarWithRows({
      rows: [
        { "1": 1, y: 2 },
        { "1": 2, y: 4 },
      ],
      columnNames: ["1", "y"],
    });
    const error = await _getRejection(
      runFitRegressionTool(avandar, { xColumn: 1, yColumn: "y" }),
    );
    expect(error).toBeInstanceOf(PluginError);
    expect((error as PluginError).code).toBe("InvalidToolInput");
    expect((error as PluginError).message).toBe(
      'Column "xColumn" is not on the result.',
    );
    expect((error as PluginError).message).not.toContain('"1"');
    expect(avandar.data.fetchRows).not.toHaveBeenCalled();
  });

  it("rejects a missing column argument without calling the handler", async () => {
    const avandar = _makeAvandarWithRows({
      rows: EXACT_LINE_ROWS,
      columnNames: ["x", "y"],
    });
    const error = await _getRejection(
      runFitRegressionTool(avandar, { xColumn: "x" }),
    );
    expect((error as PluginError).message).toBe(
      'Column "yColumn" is not on the result.',
    );
    expect(avandar.data.fetchRows).not.toHaveBeenCalled();
  });

  it("runs the fit when both arguments are strings", async () => {
    const result = await runFitRegressionTool(READY, {
      xColumn: "x",
      yColumn: "y",
    });
    expect(result.n).toBe(10);
  });
});
