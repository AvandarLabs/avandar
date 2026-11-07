import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePluginCommandRunner } from "@/lib/plugins/PluginMenuSlot/usePluginCommandRunner/usePluginCommandRunner";
import { act, renderHook, TestProviders } from "@/test-utils";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type {
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

const mocks = vi.hoisted(() => {
  return { runPluginCommand: vi.fn() };
});

vi.mock(
  "@/lib/plugins/PluginMenuSlot/loadRunPluginCommand/loadRunPluginCommand",
  () => {
    return {
      loadRunPluginCommand: () => {
        return Promise.resolve(mocks.runPluginCommand);
      },
    };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn() };
});

const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "handle" as QueryHandle,
  columns: [],
  rowCount: 1,
};

const ITEM = {
  key: "avandar.epidemiology/run",
  plugin: { entry: { id: "avandar.epidemiology" } },
  pluginName: "Epidemiology",
  commandId: "run",
  title: "Run",
  Icon: undefined,
} as PluginMenuItem;

describe("usePluginCommandRunner", () => {
  beforeEach(() => {
    mocks.runPluginCommand.mockReset();
  });

  it("clears the running key when the runner throws", async () => {
    mocks.runPluginCommand.mockRejectedValue(new Error("runner crashed"));
    const { result } = renderHook(
      () => {
        return usePluginCommandRunner(CONTEXT);
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.run(ITEM).catch(() => {});
    });

    expect(result.current.runningKey).toBeUndefined();
  });

  it("clears the running key once the command finishes", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    const { result } = renderHook(
      () => {
        return usePluginCommandRunner(CONTEXT);
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.run(ITEM);
    });

    expect(result.current.runningKey).toBeUndefined();
  });
});
