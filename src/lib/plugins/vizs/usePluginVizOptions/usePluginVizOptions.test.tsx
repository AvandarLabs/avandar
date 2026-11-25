import { describe, expect, it } from "vitest";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { usePluginVizOptions } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import { renderHook, TestProviders } from "@/test-utils";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginVizOption } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { ReactNode } from "react";

const EPIDEMIOLOGY_ID = "avandar.epidemiology";
const REGRESSION_ID = "avandar.regression";
const EPICURVE = { id: "epicurve", title: "%viz.epicurve.title%" };
const RATE_PLOT = { id: "rate-plot", title: "%viz.ratePlot.title%" };
const TREND_LINE = { id: "trend-line", title: "%viz.trendLine.title%" };

function _makeActivePlugin(options: {
  pluginId: string;
  vizTypes: ReadonlyArray<{ id: string; title: string }>;
}): ActivePlugin {
  return {
    entry: { id: options.pluginId },
    manifestModule: {
      manifest: {
        id: options.pluginId,
        contributes: { vizTypes: options.vizTypes },
      },
      strings: {
        en: {
          "viz.epicurve.title": "Epicurve",
          "viz.ratePlot.title": "Rate plot",
          "viz.trendLine.title": "Trend line",
        },
      },
      icons: {},
    },
  } as unknown as ActivePlugin;
}

function _renderOptions(
  activePlugins: readonly ActivePlugin[] | undefined,
): PluginVizOption[] {
  return renderHook(
    () => {
      return usePluginVizOptions();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <TestProviders>
            {activePlugins === undefined ? (
              children
            ) : (
              <ActivePluginsContext.Provider value={activePlugins}>
                {children}
              </ActivePluginsContext.Provider>
            )}
          </TestProviders>
        );
      },
    },
  ).result.current;
}

describe("usePluginVizOptions", () => {
  it("labels each chart type of an active plugin with its localized title", () => {
    const options = _renderOptions([
      _makeActivePlugin({
        pluginId: EPIDEMIOLOGY_ID,
        vizTypes: [EPICURVE, RATE_PLOT],
      }),
    ]);

    expect(
      options.map(({ label }) => {
        return label;
      }),
    ).toEqual(["Epicurve", "Rate plot"]);
  });

  it("encodes each option value as plugin:<pluginId>/<pluginVizId>", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
    ]);

    expect(options[0]?.value).toBe("plugin:avandar.epidemiology/epicurve");
  });

  it("carries the selection and manifest chart type of each option", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
    ]);

    expect(options[0]).toMatchObject({
      selection: { pluginId: EPIDEMIOLOGY_ID, pluginVizId: "epicurve" },
      vizType: EPICURVE,
    });
  });

  it("lists the chart types of every active plugin in plugin order", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
      _makeActivePlugin({ pluginId: REGRESSION_ID, vizTypes: [TREND_LINE] }),
    ]);

    expect(
      options.map(({ value }) => {
        return value;
      }),
    ).toEqual([
      "plugin:avandar.epidemiology/epicurve",
      "plugin:avandar.regression/trend-line",
    ]);
  });

  it("lists no options for an active plugin without chart types", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [] }),
    ]);

    expect(options).toEqual([]);
  });

  it("lists no options outside a plugin host", () => {
    expect(_renderOptions(undefined)).toEqual([]);
  });
});
