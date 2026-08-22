import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import { renderHook, waitFor } from "@/test-utils";

const DASHBOARD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "dddddddd-dddd-dddd-dddd-dddddddddddd" };
    },
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

function _wrapperForHook(options: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, options.children);
}

describe("useResourceRole", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("returns RPC role for a dashboard", async () => {
    rpcMock.mockResolvedValue({ data: "editor", error: null });

    const { result } = renderHook(
      () => {
        return useResourceRole({
          resourceType: "dashboard",
          resourceId: DASHBOARD_ID,
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe("editor");
    expect(rpcMock).toHaveBeenCalledWith("util__resource_effective_role", {
      p_resource_type: "dashboard",
      p_resource_id: DASHBOARD_ID,
    });
  });

  it("does not call RPC when resourceId is missing", () => {
    renderHook(
      () => {
        return useResourceRole({
          resourceType: "dataset",
          resourceId: undefined,
        });
      },
      { wrapper: _wrapperForHook },
    );

    expect(rpcMock).not.toHaveBeenCalled();
  });
});
