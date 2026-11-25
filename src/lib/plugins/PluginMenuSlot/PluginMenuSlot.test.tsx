import { IconPuzzle } from "@tabler/icons-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { PluginIconComponent } from "@/lib/plugins/PluginIndex.types";
import type {
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

const mocks = vi.hoisted(() => {
  return {
    runPluginCommand: vi.fn(),
    loadRunPluginCommand: vi.fn(),
    notifyError: vi.fn(),
    usePluginMenuItems: vi.fn(),
    getContext: vi.fn(),
    getDataExplorerBridge: vi.fn(),
  };
});

vi.mock("@/lib/plugins/PluginHost/usePluginMenuItems", () => {
  return { usePluginMenuItems: mocks.usePluginMenuItems };
});
vi.mock(
  "@/lib/plugins/PluginMenuSlot/loadRunPluginCommand/loadRunPluginCommand",
  () => {
    return { loadRunPluginCommand: mocks.loadRunPluginCommand };
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
  return { notifyError: mocks.notifyError };
});

const BRIDGE: DataExplorerBridge = {
  baseSql: "SELECT 1",
  applyDerivedColumnsSql: () => {
    return true;
  },
};

const SLOT_ID = "dataExplorer.toolbar";
const CONTEXT: DataExplorerToolbarContext = {
  slotId: SLOT_ID,
  queryHandle: "handle" as QueryHandle,
  columns: [],
  rowCount: 1,
};

function _makeItem(
  index: number,
  Icon: PluginIconComponent | undefined = undefined,
): PluginMenuItem {
  return {
    key: `avandar.epidemiology/c${index}`,
    plugin: {
      entry: { id: "avandar.epidemiology" },
    } as PluginMenuItem["plugin"],
    pluginName: "Epidemiology",
    commandId: `c${index}`,
    title: `Command ${index}`,
    Icon,
  };
}

function _renderSlotWithItems(options: {
  itemCount: number;
  getContext?: () => DataExplorerToolbarContext;
  icon?: PluginIconComponent;
}): ReturnType<typeof render> {
  mocks.usePluginMenuItems.mockReturnValue(
    Array.from({ length: options.itemCount }, (_, index) => {
      return _makeItem(index + 1, options.icon);
    }),
  );
  return render(
    <PluginMenuSlot
      slotId={SLOT_ID}
      getContext={
        "getContext" in options ? options.getContext : mocks.getContext
      }
      getDataExplorerBridge={mocks.getDataExplorerBridge}
      facts={{ rowCount: 1 }}
    />,
  );
}

describe("PluginMenuSlot", () => {
  beforeEach(() => {
    mocks.runPluginCommand.mockReset();
    mocks.loadRunPluginCommand.mockReset();
    mocks.loadRunPluginCommand.mockResolvedValue(mocks.runPluginCommand);
    mocks.notifyError.mockReset();
    mocks.getContext.mockReset();
    mocks.getContext.mockReturnValue(CONTEXT);
    mocks.getDataExplorerBridge.mockReset();
    mocks.getDataExplorerBridge.mockReturnValue(BRIDGE);
  });

  it("does not load the runner when the slot renders", () => {
    _renderSlotWithItems({ itemCount: 1 });

    expect(mocks.loadRunPluginCommand).not.toHaveBeenCalled();
  });

  it("does not build the invocation context when the slot renders", () => {
    _renderSlotWithItems({ itemCount: 2 });

    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("builds the invocation context once when a command is clicked", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalled();
    });
    expect(mocks.getContext).toHaveBeenCalledTimes(1);
  });

  it("does not build the Data Explorer bridge when the slot renders", () => {
    _renderSlotWithItems({ itemCount: 2 });

    expect(mocks.getDataExplorerBridge).not.toHaveBeenCalled();
  });

  it("runs the clicked command with the Data Explorer bridge it builds", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.runPluginCommand).toHaveBeenCalledWith(
        expect.objectContaining({ dataExplorerBridge: BRIDGE }),
      );
    });
    expect(mocks.getDataExplorerBridge).toHaveBeenCalledTimes(1);
  });

  it("loads the runner when a command is clicked", async () => {
    mocks.runPluginCommand.mockResolvedValue(undefined);
    _renderSlotWithItems({ itemCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.loadRunPluginCommand).toHaveBeenCalledTimes(1);
    });
  });

  it("reports a runner that fails to load in a notification naming the plugin", async () => {
    mocks.loadRunPluginCommand.mockRejectedValue(
      new Error("Failed to fetch dynamically imported module"),
    );
    _renderSlotWithItems({ itemCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not load Epidemiology" }),
      );
    });
  });

  it("runs no command when the runner fails to load", async () => {
    mocks.loadRunPluginCommand.mockRejectedValue(new Error("chunk failed"));
    _renderSlotWithItems({ itemCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalled();
    });
    expect(mocks.runPluginCommand).not.toHaveBeenCalled();
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
    _renderSlotWithItems({ itemCount: 1, getContext: undefined });

    expect(screen.getByRole("button", { name: "Command 1" })).toBeDisabled();
  });

  it("disables the Plugins button when there is no result to run on", () => {
    _renderSlotWithItems({ itemCount: 3, getContext: undefined });

    expect(screen.getByRole("button", { name: "Plugins" })).toBeDisabled();
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

  it("shows a command's icon in its button when the icon is a component", () => {
    _renderSlotWithItems({ itemCount: 1, icon: IconPuzzle });

    expect(
      screen.getByRole("button", { name: "Command 1" }).querySelector("svg"),
    ).not.toBeNull();
  });

  it("still renders a command's button when its icon is not a component", () => {
    // JSON persistence turns a component into `{}`, which React cannot render.
    _renderSlotWithItems({
      itemCount: 1,
      icon: {} as unknown as PluginIconComponent,
    });

    const button = screen.getByRole("button", { name: "Command 1" });
    expect(button.querySelector("svg")).toBeNull();
  });

  it("still renders a menu item when its icon is not a component", async () => {
    _renderSlotWithItems({
      itemCount: 3,
      icon: {} as unknown as PluginIconComponent,
    });

    fireEvent.click(screen.getByRole("button", { name: "Plugins" }));

    expect(
      await screen.findByRole("menuitem", { name: "Command 3" }),
    ).toBeInTheDocument();
  });
});
