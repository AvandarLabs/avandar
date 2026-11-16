import { describe, expect, it, vi } from "vitest";
import { fetchEdgeFunctionRoute } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";
import {
  MOCK_EDGE_FUNCTIONS_URL,
  MOCK_SESSION_ACCESS_TOKEN,
} from "@/test-utils/createAvaSupabaseSessionMock";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";

const { getSessionMock } = vi.hoisted(() => {
  return { getSessionMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", async () => {
  const { createAvaSupabaseSessionMock } =
    await import("@/test-utils/createAvaSupabaseSessionMock");
  const sessionMock = createAvaSupabaseSessionMock();
  return {
    AvaSupabase: {
      ...sessionMock.AvaSupabase,
      db: () => {
        return { auth: { getSession: getSessionMock } };
      },
    },
  };
});

describe("fetchEdgeFunctionRoute", () => {
  it("calls the route under the functions URL with the caller's session", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: MOCK_SESSION_ACCESS_TOKEN } },
    });
    const routeResponse = new Response("id\r\n1\r\n");
    const routeFetch = vi.fn<EdgeFunctionFetch>(async () => {
      return routeResponse;
    });

    const response = await fetchEdgeFunctionRoute({
      path: "google-sheets/datasets/abc/csv",
      fetch: routeFetch,
    });

    expect(routeFetch).toHaveBeenCalledWith(
      `${MOCK_EDGE_FUNCTIONS_URL}/google-sheets/datasets/abc/csv`,
      { headers: { Authorization: `Bearer ${MOCK_SESSION_ACCESS_TOKEN}` } },
    );
    expect(response).toBe(routeResponse);
  });

  it("refuses to call a route when nobody is signed in", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const routeFetch = vi.fn<EdgeFunctionFetch>();

    await expect(
      fetchEdgeFunctionRoute({ path: "some/route", fetch: routeFetch }),
    ).rejects.toThrow("No session is available");
    expect(routeFetch).not.toHaveBeenCalled();
  });
});
