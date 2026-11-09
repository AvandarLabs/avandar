import { describe, expect, it } from "vitest";
import { getMenuItemsFromActivePlugins } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { WhenCondition } from "@avandar/plugin-manifest/runtime";

const PLUGIN_ID = "avandar.epidemiology";
const SLOT_ID = "dataExplorer.toolbar";
const REQUIRES_TWO_NUMERIC_COLUMNS: WhenCondition = {
  numericColumnCount: { gte: 2 },
};

function _TrendingUpIcon(): null {
  return null;
}

function _makeActivePlugin(when?: WhenCondition): ActivePlugin {
  return {
    entry: { id: PLUGIN_ID },
    manifestModule: {
      manifest: {
        id: PLUGIN_ID,
        name: "%plugin.name%",
        contributes: {
          commands: [
            { id: "regression.linear", title: "%title%", icon: "trending-up" },
          ],
          menus: { [SLOT_ID]: [{ command: "regression.linear", when }] },
        },
      },
      strings: {
        en: { "plugin.name": "Epidemiology", title: "Linear regression" },
        es: { "plugin.name": "Epidemiologia", title: "Regresion lineal" },
      },
      icons: { "trending-up": _TrendingUpIcon },
    },
  } as unknown as ActivePlugin;
}

describe("getMenuItemsFromActivePlugins", () => {
  it("returns an item with resolved text when its condition holds", () => {
    const activePlugin = _makeActivePlugin(REQUIRES_TWO_NUMERIC_COLUMNS);

    const items = getMenuItemsFromActivePlugins({
      activePlugins: [activePlugin],
      slotId: SLOT_ID,
      facts: { numericColumnCount: 2 },
      locale: "en",
    });

    expect(items).toEqual([
      {
        key: `${PLUGIN_ID}/regression.linear`,
        plugin: activePlugin,
        commandId: "regression.linear",
        pluginName: "Epidemiology",
        title: "Linear regression",
        Icon: _TrendingUpIcon,
      },
    ]);
  });

  it("omits an item when its condition fails", () => {
    const items = getMenuItemsFromActivePlugins({
      activePlugins: [_makeActivePlugin(REQUIRES_TWO_NUMERIC_COLUMNS)],
      slotId: SLOT_ID,
      facts: { numericColumnCount: 1 },
      locale: "en",
    });

    expect(items).toEqual([]);
  });

  it("returns an item with no condition whatever the facts are", () => {
    const items = getMenuItemsFromActivePlugins({
      activePlugins: [_makeActivePlugin()],
      slotId: SLOT_ID,
      facts: {},
      locale: "en",
    });

    expect(
      items.map(({ commandId }) => {
        return commandId;
      }),
    ).toEqual(["regression.linear"]);
  });

  it("resolves titles in the requested locale", () => {
    const [item] = getMenuItemsFromActivePlugins({
      activePlugins: [_makeActivePlugin()],
      slotId: SLOT_ID,
      facts: {},
      locale: "es",
    });

    expect(item?.title).toBe("Regresion lineal");
  });

  it("returns nothing when a plugin places no command in the slot", () => {
    const plugin = _makeActivePlugin();
    plugin.manifestModule.manifest.contributes.menus = {};

    const items = getMenuItemsFromActivePlugins({
      activePlugins: [plugin],
      slotId: SLOT_ID,
      facts: {},
      locale: "en",
    });

    expect(items).toEqual([]);
  });

  it("returns a command listed twice in one slot once", () => {
    const plugin = _makeActivePlugin();
    plugin.manifestModule.manifest.contributes.menus = {
      [SLOT_ID]: [
        { command: "regression.linear" },
        { command: "regression.linear" },
      ],
    };

    const items = getMenuItemsFromActivePlugins({
      activePlugins: [plugin],
      slotId: SLOT_ID,
      facts: {},
      locale: "en",
    });

    expect(items).toHaveLength(1);
  });

  it("returns a command once when only its second entry holds", () => {
    const plugin = _makeActivePlugin();
    plugin.manifestModule.manifest.contributes.menus = {
      [SLOT_ID]: [
        {
          command: "regression.linear",
          when: { numericColumnCount: { gte: 1 } },
        },
        { command: "regression.linear" },
      ],
    };

    const items = getMenuItemsFromActivePlugins({
      activePlugins: [plugin],
      slotId: SLOT_ID,
      facts: { numericColumnCount: 0 },
      locale: "en",
    });

    expect(items).toHaveLength(1);
  });
});
