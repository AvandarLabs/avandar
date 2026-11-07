import { useAvandar } from "@avandar/plugin-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { act, cleanup, render, screen } from "@/test-utils";
import type {
  AvandarApi,
  DataExplorerToolbarContext,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

const ROWS = [
  { x: 1, y: "a" },
  { x: 2, y: "b" },
];

function _makeApiFromRows(): AvandarApi {
  const context: DataExplorerToolbarContext = {
    slotId: "dataExplorer.toolbar",
    queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
    columns: [],
    rowCount: ROWS.length,
  };
  return makePluginApi({
    pluginName: "Test plugin",
    context,
    workspace: { id: "w", slug: "w", locale: "es" },
    messages: { en: { greeting: "Hello" }, es: { greeting: "Hola" } },
  });
}

function ContextProbe(): ReactNode {
  return <p>{`rows: ${useAvandar().context.rowCount}`}</p>;
}

function CrashingContent(): ReactNode {
  throw new Error("plugin UI crashed");
}

describe("makePluginApi", () => {
  afterEach(() => {
    act(() => {
      PluginDrawerStore.close();
    });
    cleanup();
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
    expect(_makeApiFromRows().i18n.t("greeting")).toBe("Hola");
  });

  it("titles a notification with the plugin name by default", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.notify({ message: "Saved" });
    });

    expect(await screen.findByText("Test plugin")).toBeTruthy();
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("gives drawer content the scoped API through useAvandar", async () => {
    render(<PluginDrawerHost />);

    act(() => {
      _makeApiFromRows().ui.openDrawer({
        title: "Details",
        content: <ContextProbe />,
      });
    });

    expect(await screen.findByText("Details")).toBeTruthy();
    expect(await screen.findByText("rows: 2")).toBeTruthy();
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

    expect(
      await screen.findByText(
        "Something went wrong in this plugin. Close this panel and try again.",
      ),
    ).toBeTruthy();
  });
});
