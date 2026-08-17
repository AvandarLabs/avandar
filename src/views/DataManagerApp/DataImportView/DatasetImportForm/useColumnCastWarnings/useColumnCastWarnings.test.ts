import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import { useColumnCastWarnings } from "./useColumnCastWarnings";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const probeColumnCastLossMock = vi.hoisted(() => {
  return vi.fn();
});

vi.mock(
  "@/clients/DuckDbClient/probeColumnCastLoss/probeColumnCastLoss",
  () => {
    return { probeColumnCastLoss: probeColumnCastLossMock };
  },
);

vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

function _column(
  overrides: Partial<DatasetColumn.Imported> = {},
): DatasetColumn.Imported {
  return {
    originalName: "amount",
    name: "amount",
    originalDataType: "VARCHAR",
    detectedDataType: "VARCHAR",
    dataType: "varchar",
    isDataTypeUserSet: false,
    columnIdx: 0,
    ...overrides,
  };
}

const PREVIEW_ROWS = [{ amount: "1" }, { amount: "two" }];

describe("useColumnCastWarnings", () => {
  beforeEach(() => {
    probeColumnCastLossMock.mockReset();
    probeColumnCastLossMock.mockResolvedValue({
      numValues: 2,
      numUncastable: 1,
    });
  });

  it("does not probe a column whose type came from inference", () => {
    const { result } = renderHook(() => {
      return useColumnCastWarnings({
        columns: [_column()],
        previewRows: PREVIEW_ROWS,
      });
    });

    expect(probeColumnCastLossMock).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it("warns about a user-typed column the sample does not fit", async () => {
    const { result } = renderHook(() => {
      return useColumnCastWarnings({
        columns: [_column({ dataType: "bigint", isDataTypeUserSet: true })],
        previewRows: PREVIEW_ROWS,
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        {
          columnIdx: 0,
          columnName: "amount",
          dataType: "bigint",
          numValues: 2,
          numUncastable: 1,
        },
      ]);
    });
  });

  it("stays quiet when every sampled value fits the chosen type", async () => {
    probeColumnCastLossMock.mockResolvedValue({
      numValues: 2,
      numUncastable: 0,
    });

    const { result } = renderHook(() => {
      return useColumnCastWarnings({
        columns: [_column({ dataType: "bigint", isDataTypeUserSet: true })],
        previewRows: PREVIEW_ROWS,
      });
    });

    await waitFor(() => {
      expect(probeColumnCastLossMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toEqual([]);
  });

  it("reports the column's current name after a rename, without re-probing", async () => {
    const { result, rerender } = renderHook(
      (props: { columns: DatasetColumn.Imported[] }) => {
        return useColumnCastWarnings({
          columns: props.columns,
          previewRows: PREVIEW_ROWS,
        });
      },
      {
        initialProps: {
          columns: [_column({ dataType: "bigint", isDataTypeUserSet: true })],
        },
      },
    );

    await waitFor(() => {
      expect(result.current[0]?.columnName).toBe("amount");
    });

    rerender({
      columns: [
        _column({
          name: "Amount owed",
          dataType: "bigint",
          isDataTypeUserSet: true,
        }),
      ],
    });

    expect(result.current[0]?.columnName).toBe("Amount owed");
    expect(probeColumnCastLossMock).toHaveBeenCalledTimes(1);
  });

  it("clears the warning once the user's type override is undone", async () => {
    const { result, rerender } = renderHook(
      (props: { columns: DatasetColumn.Imported[] }) => {
        return useColumnCastWarnings({
          columns: props.columns,
          previewRows: PREVIEW_ROWS,
        });
      },
      {
        initialProps: {
          columns: [_column({ dataType: "bigint", isDataTypeUserSet: true })],
        },
      },
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });

    rerender({ columns: [_column()] });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("swallows a failed probe so it cannot block the import", async () => {
    probeColumnCastLossMock.mockRejectedValue(new Error("duckdb is busy"));

    const { result } = renderHook(() => {
      return useColumnCastWarnings({
        columns: [_column({ dataType: "bigint", isDataTypeUserSet: true })],
        previewRows: PREVIEW_ROWS,
      });
    });

    await waitFor(() => {
      expect(probeColumnCastLossMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toEqual([]);
  });
});
