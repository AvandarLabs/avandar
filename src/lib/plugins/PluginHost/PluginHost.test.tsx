import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PluginHost } from "@/lib/plugins/PluginHost/PluginHost";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { render } from "@/test-utils";
import type { ReactNode } from "react";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        useGetAll: () => {
          return [[]];
        },
      },
    };
  },
);

function _renderHost(): ReturnType<typeof render> {
  const queryClient = new QueryClient();
  return render(<PluginHost>{null}</PluginHost>, {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
}

describe("PluginHost", () => {
  it("clears the query handle registry when it unmounts", () => {
    const { unmount } = _renderHost();
    const handle = QueryHandleRegistry.getOrCreate([{ cases: 3 }]);

    unmount();

    expect(QueryHandleRegistry.getRows(handle)).toBeUndefined();
  });
});
