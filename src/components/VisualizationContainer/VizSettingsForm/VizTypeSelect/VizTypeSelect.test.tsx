/**
 * Tests for the visualization type picker: the display name of each built-in
 * type, the "Plugins" group of the workspace's active plugin chart types, and
 * what it reports back when a type is picked.
 */
import { describe, expect, it, vi } from "vitest";
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";

const PLUGIN_ID = "avandar.epidemiology";

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "cases" as QueryColumn.Id, name: "cases", dataType: "bigint" },
  { id: "onset" as QueryColumn.Id, name: "onset", dataType: "date" },
];

const EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" as QueryColumn.Id },
  settings: { interval: "epiWeek" },
};

function _ChartBarIcon(): null {
  return null;
}

const EPIDEMIOLOGY_PLUGIN = {
  entry: { id: PLUGIN_ID },
  manifestModule: {
    manifest: {
      id: PLUGIN_ID,
      name: "%plugin.name%",
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [
          {
            id: "epicurve",
            title: "%viz.epicurve.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "dateColumn",
                label: "%viz.epicurve.dateColumn%",
                control: { kind: "columnPicker", dataType: "temporal" },
                required: true,
              },
              {
                key: "interval",
                label: "%viz.epicurve.interval%",
                control: {
                  kind: "select",
                  options: [
                    { value: "day", label: "%viz.epicurve.day%" },
                    { value: "epiWeek", label: "%viz.epicurve.epiWeek%" },
                  ],
                },
                required: false,
                default: "epiWeek",
              },
            ],
          },
        ],
      },
    },
    strings: {
      en: {
        "plugin.name": "Epidemiology",
        "viz.epicurve.title": "Epicurve",
        "viz.epicurve.dateColumn": "Date column",
        "viz.epicurve.interval": "Interval",
        "viz.epicurve.day": "Day",
        "viz.epicurve.epiWeek": "Epi week",
      },
    },
    icons: { "chart-bar": _ChartBarIcon },
  },
} as unknown as ActivePlugin;

function _renderPicker(
  options: {
    vizConfig?: AvaVizConfig.T;
    activePlugins?: readonly ActivePlugin[];
  } = {},
): { onChange: ReturnType<typeof vi.fn> } {
  const { vizConfig = { vizType: "table" }, activePlugins = [] } = options;
  const onChange = vi.fn();
  render(
    <ActivePluginsContext.Provider value={activePlugins}>
      <VizTypeSelect
        vizConfig={vizConfig}
        columns={COLUMNS}
        onChange={onChange}
      />
    </ActivePluginsContext.Provider>,
  );
  return { onChange };
}

function _openDropdown(): HTMLElement {
  const combobox = screen.getByRole("combobox", {
    name: /visualization type/i,
  });
  fireEvent.click(combobox);
  fireEvent.focus(combobox);
  return getMantineSelectDropdown(/Visualization Type/i);
}

describe("VizTypeSelect", () => {
  it("reports the picked visualization type", () => {
    const { onChange } = _renderPicker();

    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");

    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("shows the display name of the current type rather than its key", () => {
    _renderPicker();

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Table");
  });

  it("lists an active plugin's chart types under a Plugins group", () => {
    _renderPicker({ activePlugins: [EPIDEMIOLOGY_PLUGIN] });

    const pluginsGroup = within(_openDropdown()).getByRole("group", {
      name: "Plugins",
      hidden: true,
    });

    expect(
      within(pluginsGroup).getByRole("option", {
        name: "Epicurve",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("omits the Plugins group when no plugin is active", () => {
    _renderPicker();

    expect(
      within(_openDropdown()).queryByRole("group", {
        name: "Plugins",
        hidden: true,
      }),
    ).toBeNull();
  });

  it("reports a config built from the result's columns when a plugin chart type is picked", () => {
    const { onChange } = _renderPicker({
      activePlugins: [EPIDEMIOLOGY_PLUGIN],
    });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(onChange).toHaveBeenCalledWith({
      vizType: "plugin",
      pluginId: PLUGIN_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: "onset" },
      settings: { interval: "epiWeek" },
    });
  });

  it("shows the plugin chart's title as the current type when a plugin chart is active", () => {
    _renderPicker({
      vizConfig: EPICURVE_CONFIG,
      activePlugins: [EPIDEMIOLOGY_PLUGIN],
    });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Epicurve");
  });

  it("keeps showing an active plugin chart whose plugin is no longer active", () => {
    _renderPicker({ vizConfig: EPICURVE_CONFIG });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Plugin chart");
  });
});
