import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type {
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

const mocks = vi.hoisted(() => {
  return {
    runPluginCommand: vi.fn(),
    notifyError: vi.fn(),
    usePluginMenuItems: vi.fn(),
    runnerModuleLoadCount: 0,
    isRunnerChunkBroken: false,
  };
});

vi.mock("@/lib/plugins/PluginHost/usePluginMenuItems", () => {
  return { usePluginMenuItems: mocks.usePluginMenuItems };
});
vi.mock("@/lib/plugins/runPluginCommand/runPluginCommand", () => {
  mocks.runnerModuleLoadCount += 1;
  if (mocks.isRunnerChunkBroken) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return { runPluginCommand: mocks.runPluginCommand };
});
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
  return { notifyError: mocks.notifyError };
});

const SLOT_ID = "dataExplorer.toolbar";
const CONTEXT: DataExplorerToolbarContext = {
  slotId: SLOT_ID,
  queryHandle: "handle" as QueryHandle,
  columns: [],
  rowCount: 1,
};

function _makeItem(index: number): PluginMenuItem {
  return {
    key: `avandar.epidemiology/c${index}`,
    plugin: {
      entry: { id: "avandar.epidemiology" },
    } as PluginMenuItem["plugin"],
    pluginName: "Epidemiology",
    commandId: `c${index}`,
    title: `Command ${index}`,
    Icon: undefined,
  };
}

function _renderSlotWithItems(options: {
  itemCount: number;
  context?: DataExplorerToolbarContext;
}): ReturnType<typeof render> {
  mocks.usePluginMenuItems.mockReturnValue(
    Array.from({ length: options.itemCount }, (_, index) => {
      return _makeItem(index + 1);
    }),
  );
  return render(
    <PluginMenuSlot
      slotId={SLOT_ID}
      context={"context" in options ? options.context : CONTEXT}
      facts={{ rowCount: 1 }}
    />,
  );
}

describe("PluginMenuSlot", () => {
  beforeEach(() => {
    mocks.runPluginCommand.mockReset();
    mocks.notifyError.mockReset();
    mocks.isRunnerChunkBroken = false;
  });

  // This runs first on purpose. The runner is loaded once and kept for the
  // page's lifetime, so only the first click in this file can see it unloaded.
  it("loads the runner on a click, and loads it again after a failed load", async () => {
    mocks.isRunnerChunkBroken = true;
    _renderSlotWithItems({ itemCount: 1 });
    expect(mocks.runnerModuleLoadCount).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));
    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not load Epidemiology" }),
      );
    });
    expect(mocks.runPluginCommand).not.toHaveBeenCalled();

    mocks.isRunnerChunkBroken = false;
    mocks.runPluginCommand.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));
    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalledTimes(1);
    });
  });

  it("renders nothing when no plugin has an item for the slot", () => {
    _renderSlotWithItems({ itemCount: 0 });

    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("asks for the items of its slot using the facts it was given", () => {
    _renderSlotWithItems({ itemCount: 1 });

    expect(mocks.usePluginMenuItems).toHaveBeenCalledWith({
      slotId: SLOT_ID,
      facts: { rowCount: 1 },
    });
  });

  it("runs the clicked command with its plugin, context, and workspace", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 2" }));

    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          plugin: _makeItem(2).plugin,
          pluginName: "Epidemiology",
          commandId: "c2",
          context: CONTEXT,
          workspace: {
            id: "workspace-id",
            slug: "workspace-slug",
            locale: "en",
          },
        }),
      );
    });
  });

  it("renders two items as two buttons and no menu", () => {
    _renderSlotWithItems({ itemCount: 2 });

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Plugins" })).toBeNull();
  });

  it("collapses more than two items into one Plugins menu button", () => {
    _renderSlotWithItems({ itemCount: 3 });

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Plugins" })).toBeInTheDocument();
  });

  it("runs the command a user picks from the Plugins menu", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 3 });

    fireEvent.click(screen.getByRole("button", { name: "Plugins" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Command 3" }));

    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalledWith(
        expect.objectContaining({ commandId: "c3" }),
      );
    });
  });

  it("disables the buttons when there is no result to run on", () => {
    _renderSlotWithItems({ itemCount: 1, context: undefined });

    expect(screen.getByRole("button", { name: "Command 1" })).toBeDisabled();
  });

  it("shows a loading state on the running command's button only", () => {
    mocks.runPluginCommand.mockReturnValue(new Promise(() => {}));
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    expect(screen.getByRole("button", { name: "Command 1" })).toHaveAttribute(
      "data-loading",
    );
    expect(
      screen.getByRole("button", { name: "Command 2" }),
    ).not.toHaveAttribute("data-loading");
  });

  it("disables every button while one command is running", () => {
    mocks.runPluginCommand.mockReturnValue(new Promise(() => {}));
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    expect(screen.getByRole("button", { name: "Command 2" })).toBeDisabled();
  });

  it("enables the buttons again once the command finishes", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Command 2" })).toBeEnabled();
    });
  });

  it("reports a failed command in a notification naming the plugin", async () => {
    mocks.runPluginCommand.mockResolvedValue({
      kind: "command_failed",
      error: new Error("boom"),
    });
    _renderSlotWithItems({ itemCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Epidemiology: the command failed" }),
      );
    });
  });

  it("reports a command with no handler as not available", async () => {
    mocks.runPluginCommand.mockResolvedValue({ kind: "missing_handler" });
    _renderSlotWithItems({ itemCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Epidemiology: this command is not available",
        }),
      );
    });
  });
});
