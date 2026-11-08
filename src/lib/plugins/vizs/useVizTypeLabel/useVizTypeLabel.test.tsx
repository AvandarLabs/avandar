import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVizTypeLabel } from "@/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      contributes: {
        vizTypes: [{ id: "epicurve", title: "%viz.epicurve.title%" }],
      },
    },
    strings: { en: { "viz.epicurve.title": "Epicurve" } },
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  loadManifest: (pluginId: string) => Promise<PluginManifestModule> = (
    pluginId,
  ) => {
    return Promise.resolve(_makeManifestModule(pluginId));
  },
): string {
  nextPluginNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `avandar.epidemiology-${nextPluginNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return loadManifest(id);
    },
  });
  return id;
}

function _makePluginConfig(pluginId: string): AvaVizConfig.T {
  return {
    vizType: "plugin",
    pluginId,
    pluginVizId: "epicurve",
    columnSettings: {},
    settings: {},
  };
}

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
}

function _renderLabel(config: AvaVizConfig.T): { current: string } {
  return renderHook(
    () => {
      return useVizTypeLabel(config);
    },
    { wrapper: Wrapper },
  ).result;
}

describe("useVizTypeLabel", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
  });

  it("returns the built-in label for a built-in chart", () => {
    const label = _renderLabel({
      vizType: "bar",
      xAxisKey: undefined,
      series: [],
      layout: "group",
      withLegend: true,
    });

    expect(label.current).toBe("Bar Chart");
  });

  it("returns the plugin chart type's localized title once its manifest loads", async () => {
    const label = _renderLabel(_makePluginConfig(_addBundledPlugin()));

    await waitFor(() => {
      expect(label.current).toBe("Epicurve");
    });
  });

  it("returns Plugin chart while the plugin's manifest loads", () => {
    const pluginId = _addBundledPlugin(() => {
      return new Promise<PluginManifestModule>(() => {});
    });

    const label = _renderLabel(_makePluginConfig(pluginId));

    expect(label.current).toBe("Plugin chart");
  });

  it("returns Plugin chart when the plugin is not bundled", async () => {
    const label = _renderLabel(_makePluginConfig("avandar.removed"));
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });

    expect(label.current).toBe("Plugin chart");
  });
});
