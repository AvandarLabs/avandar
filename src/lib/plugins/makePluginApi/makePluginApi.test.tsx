import { useAvandar } from "@avandar/plugin-sdk";
import { ModalsProvider, modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { act, cleanup, render, screen, waitFor } from "@/test-utils";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  AvandarApi,
  DataExplorerToolbarContext,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

const CRASH_FALLBACK_TEXT =
  "Something went wrong in this plugin. Close this panel and try again.";

const ROWS = [
  { x: 1, y: "a" },
  { x: 2, y: "b" },
];

function _makeApiFromRows(dataExplorerBridge?: DataExplorerBridge): AvandarApi {
  const context: DataExplorerToolbarContext = {
    slotId: "dataExplorer.toolbar",
    queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
    columns: [
      { name: "x", dataType: "bigint" },
      { name: "y", dataType: "varchar" },
    ],
    rowCount: ROWS.length,
  };
  return makePluginApi({
    pluginName: "Test plugin",
    context,
    workspace: { id: "w", slug: "w", locale: "es" },
    messages: { en: { greeting: "Hello" }, es: { greeting: "Hola" } },
    dataExplorerBridge,
  });
}

function _makeBridge(): DataExplorerBridge & {
  applyDerivedColumnsSql: ReturnType<typeof vi.fn>;
} {
  return {
    baseSql: `SELECT * FROM "t"`,
    applyDerivedColumnsSql: vi.fn(() => {
      return true;
    }),
  };
}

function ContextProbe(): ReactNode {
  return <p>{`rows: ${useAvandar().context.rowCount}`}</p>;
}

function CrashingContent(): ReactNode {
  throw new Error("plugin UI crashed");
}

describe("makePluginApi", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      PluginDrawerStore.clear();
      modals.closeAll();
      notifications.clean();
    });
    vi.restoreAllMocks();
  });

  it("fetches the requested columns of the invocation's own handle", async () => {
    const api = _makeApiFromRows();

    const result = await api.data.fetchRows(api.context.queryHandle, {
      columns: ["x"],
    });

    expect(result.rows).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it("rejects fetchRows for a handle other than the invocation's", async () => {
    const api = _makeApiFromRows();
    const otherHandle = QueryHandleRegistry.getOrCreate([{ x: 9 }]);

    await expect(
      api.data.fetchRows(otherHandle, { columns: ["x"] }),
    ).rejects.toMatchObject({ code: "PermissionDenied" });
  });

  it("translates plugin messages in the workspace locale", () => {
    // `translate` is not named `i18n.t`, which `lingui extract` would read as
    // an app message and add to the catalogs.
    const { t: translate } = _makeApiFromRows().i18n;
    expect(translate("greeting")).toBe("Hola");
  });

  it("titles a notification with the plugin name by default", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.notify({ message: "Saved" });
    });

    expect(await screen.findByText("Test plugin")).toBeInTheDocument();
  });

  it("shows the message a plugin notifies", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.notify({ message: "Saved" });
    });

    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("titles the drawer with the title the plugin gives", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.openDrawer({ title: "Details", content: null });
    });

    expect(await screen.findByText("Details")).toBeInTheDocument();
  });

  it("opens no drawer for an api made before the host unmounted", () => {
    const previousHost = render(<PluginDrawerHost />);
    const api = _makeApiFromRows();
    previousHost.unmount();
    render(<PluginDrawerHost />);

    act(() => {
      api.ui.openDrawer({ title: "Stale", content: <p>stale body</p> });
    });

    expect(PluginDrawerStore.getSnapshot()).toBeUndefined();
  });

  it("opens a drawer for an api made after the host mounted again", async () => {
    const previousHost = render(<PluginDrawerHost />);
    previousHost.unmount();
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.openDrawer({ title: "Fresh", content: null });
    });

    expect(await screen.findByText("Fresh")).toBeInTheDocument();
  });

  it("gives drawer content the scoped API through useAvandar", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.openDrawer({
        title: "Details",
        content: <ContextProbe />,
      });
    });

    expect(await screen.findByText("rows: 2")).toBeInTheDocument();
  });

  it("contains a crash in drawer content to the drawer", async () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.openDrawer({
        title: "Details",
        content: <CrashingContent />,
      });
    });

    expect(await screen.findByText(CRASH_FALLBACK_TEXT)).toBeInTheDocument();
  });

  it("renders drawer content that opens after content that crashed", async () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PluginDrawerHost />);
    const api = _makeApiFromRows();
    act(() => {
      api.ui.openDrawer({ title: "Broken", content: <CrashingContent /> });
    });
    await screen.findByText(CRASH_FALLBACK_TEXT);

    act(() => {
      api.ui.openDrawer({ title: "Details", content: <ContextProbe /> });
    });

    expect(await screen.findByText("rows: 2")).toBeInTheDocument();
  });

  it("gives modal content the scoped API through useAvandar", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);

    act(() => {
      _makeApiFromRows().ui.openModal({
        title: "Details",
        content: <ContextProbe />,
      });
    });

    expect(await screen.findByText("rows: 2")).toBeInTheDocument();
  });

  it("opens no modal for an api made before the host unmounted", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);
    const previousHost = render(<PluginDrawerHost />);
    const staleApi = _makeApiFromRows();
    previousHost.unmount();
    render(<PluginDrawerHost />);
    act(() => {
      _makeApiFromRows().ui.openModal({
        title: "Fresh",
        content: <p>fresh body</p>,
      });
    });
    await screen.findByText("fresh body");

    act(() => {
      staleApi.ui.openModal({ title: "Stale", content: <p>stale body</p> });
    });

    expect(screen.getByText("fresh body")).toBeInTheDocument();
    expect(screen.queryByText("stale body")).not.toBeInTheDocument();
  });

  it("closes the modal the invocation opened", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);
    const api = _makeApiFromRows();
    act(() => {
      api.ui.openModal({ title: "Details", content: <p>modal body</p> });
    });
    await screen.findByText("modal body");

    act(() => {
      api.ui.closeModal();
    });

    await waitFor(() => {
      expect(screen.queryByText("modal body")).not.toBeInTheDocument();
    });
  });

  it("leaves open a modal another invocation opened", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);
    act(() => {
      _makeApiFromRows().ui.openModal({
        title: "Other",
        content: <p>other body</p>,
      });
    });
    await screen.findByText("other body");

    act(() => {
      _makeApiFromRows().ui.closeModal();
    });

    expect(screen.getByText("other body")).toBeInTheDocument();
  });

  it("adds columns through the Data Explorer bridge", async () => {
    const bridge = _makeBridge();
    const api = _makeApiFromRows(bridge);

    const result = await api.dataExplorer?.addColumns([
      { name: "double_x", expression: "{x} * 2", inputs: { x: "x" } },
    ]);

    expect(result).toEqual({ columnNames: ["double_x"] });
    expect(bridge.applyDerivedColumnsSql).toHaveBeenCalledTimes(1);
  });

  it("rejects addColumns with InvalidExpression for an invalid column", async () => {
    const api = _makeApiFromRows(_makeBridge());

    await expect(api.dataExplorer?.addColumns([])).rejects.toMatchObject({
      code: "InvalidExpression",
    });
  });

  it("rejects addColumns with InvalidHandle for an api made before the host unmounted", async () => {
    const previousHost = render(<PluginDrawerHost />);
    const bridge = _makeBridge();
    const staleApi = _makeApiFromRows(bridge);
    previousHost.unmount();

    await expect(
      staleApi.dataExplorer?.addColumns([
        { name: "double_x", expression: "{x} * 2", inputs: { x: "x" } },
      ]),
    ).rejects.toMatchObject({ code: "InvalidHandle" });
    expect(bridge.applyDerivedColumnsSql).not.toHaveBeenCalled();
  });

  it("gives no dataExplorer API to an invocation without a bridge", () => {
    expect(_makeApiFromRows().dataExplorer).toBeUndefined();
  });

  it("names the modal's close button", async () => {
    render(<ModalsProvider>{null}</ModalsProvider>);

    act(() => {
      _makeApiFromRows().ui.openModal({ title: "Details", content: null });
    });

    expect(
      await screen.findByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
  });
});
