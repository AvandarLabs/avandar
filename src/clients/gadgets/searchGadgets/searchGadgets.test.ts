import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchGadgets } from "@/clients/gadgets/searchGadgets/searchGadgets";

const { rpcMock, throwOnErrorMock, abortSignalMock } = vi.hoisted(() => {
  return {
    rpcMock: vi.fn(),
    throwOnErrorMock: vi.fn(),
    abortSignalMock: vi.fn(),
  };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { rpc: rpcMock };
      },
    },
  };
});

const ROW = {
  gadget_type: "dashboard_tile",
  gadget_id: "11111111-1111-4111-8111-111111111111",
  sub_id: "DataViz-1",
  label: "Cases per week",
  sub_label: "Measles by borough",
  has_limited_audience: false,
  updated_at: "2026-11-06T10:00:00+00:00",
  rank: 1.2,
};

function _mockRows(rows: unknown[]): void {
  throwOnErrorMock.mockResolvedValue({ data: rows, error: null });
}

beforeEach(() => {
  rpcMock.mockReset();
  throwOnErrorMock.mockReset();
  abortSignalMock.mockReset();
  const builder = {
    throwOnError: throwOnErrorMock,
    abortSignal: abortSignalMock,
  };
  abortSignalMock.mockReturnValue(builder);
  rpcMock.mockReturnValue(builder);
});

describe("searchGadgets", () => {
  it("passes the workspace, query, and limit to the search RPC", async () => {
    _mockRows([]);
    await searchGadgets({ workspaceId: "w1", query: "cases", limit: 20 });
    expect(rpcMock).toHaveBeenCalledWith("rpc_gadgets__search", {
      p_workspace_id: "w1",
      p_query: "cases",
      p_limit: 20,
    });
  });

  it("lets the caller abort the request with a signal", async () => {
    _mockRows([]);
    const controller = new AbortController();
    await searchGadgets({
      workspaceId: "w1",
      query: "cases",
      limit: 20,
      signal: controller.signal,
    });
    expect(abortSignalMock).toHaveBeenCalledWith(controller.signal);
  });

  it("maps a tile row to a result with its ref and labels", async () => {
    _mockRows([ROW]);
    const results = await searchGadgets({
      workspaceId: "w1",
      query: "cases",
      limit: 20,
    });
    expect(results).toEqual([
      {
        ref: {
          gadgetType: "dashboard_tile",
          gadgetId: ROW.gadget_id,
          subId: "DataViz-1",
        },
        label: "Cases per week",
        subLabel: "Measles by borough",
        hasLimitedAudience: false,
      },
    ]);
  });

  it("drops rows that are not valid refs", async () => {
    _mockRows([{ ...ROW, sub_id: null }]);
    expect(
      await searchGadgets({ workspaceId: "w1", query: "", limit: 20 }),
    ).toEqual([]);
  });

  it("drops rows whose columns do not have the expected types", async () => {
    _mockRows([{ ...ROW, has_limited_audience: null }]);
    expect(
      await searchGadgets({ workspaceId: "w1", query: "", limit: 20 }),
    ).toEqual([]);
  });

  it("gives a gadget with a null sub label no sub label", async () => {
    _mockRows([
      { ...ROW, gadget_type: "dashboard", sub_id: null, sub_label: null },
    ]);
    const results = await searchGadgets({
      workspaceId: "w1",
      query: "",
      limit: 20,
    });
    expect(results).toEqual([
      {
        ref: { gadgetType: "dashboard", gadgetId: ROW.gadget_id, subId: null },
        label: "Cases per week",
        subLabel: undefined,
        hasLimitedAudience: false,
      },
    ]);
  });

  it("throws when the RPC fails", async () => {
    throwOnErrorMock.mockRejectedValue(new Error("boom"));
    await expect(
      searchGadgets({ workspaceId: "w1", query: "x", limit: 20 }),
    ).rejects.toThrow("boom");
  });
});
