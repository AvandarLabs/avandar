import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import { renderHook, waitFor } from "@/test-utils";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
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
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const EPICURVE: PluginVizType = {
  id: "epicurve",
  title: "%viz.epicurve.title%",
  icon: "chart-histogram",
  render: "transform",
  settings: [],
};

type RenderedLookup = Readonly<{
  result: { current: PluginVizTypeLookup };
  unmount: () => void;
}>;

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: { id: pluginId, contributes: { vizTypes: [EPICURVE] } },
    strings: {},
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

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderLookup(
  selection: PluginVizSelection | undefined,
): RenderedLookup {
  return renderHook(
    () => {
      return usePluginVizType(selection);
    },
    { wrapper: QueryWrapper },
  );
}

describe("usePluginVizType", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
  });

  it("reports the chart type the bundled manifest declares", async () => {
    const pluginId = _addBundledPlugin();

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        vizType: EPICURVE,
      });
    });
  });

  it("reports missing when this deployment does not bundle the plugin", async () => {
    const { result } = _renderLookup({
      pluginId: "avandar.removed",
      pluginVizId: "epicurve",
    });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("reports missing when the manifest declares no chart type with that id", async () => {
    const pluginId = _addBundledPlugin();

    const { result } = _renderLookup({ pluginId, pluginVizId: "rate-plot" });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("reports loading while the manifest chunk downloads", async () => {
    const loadManifest = vi.fn(() => {
      return new Promise<PluginManifestModule>(() => {});
    });
    const pluginId = _addBundledPlugin(loadManifest);

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(loadManifest).toHaveBeenCalled();
    });

    expect(result.current.status).toBe("loading");
  });

  it("reports missing when the manifest fails to load", async () => {
    const pluginId = _addBundledPlugin(() => {
      return Promise.reject(new Error("chunk failed"));
    });

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("loads a failed manifest again the next time the lookup is used", async () => {
    let numLoads = 0;
    const pluginId = _addBundledPlugin((id) => {
      numLoads += 1;
      return numLoads === 1
        ? Promise.reject(new Error("chunk failed"))
        : Promise.resolve(_makeManifestModule(id));
    });
    const firstLookup = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(firstLookup.result.current.status).toBe("missing");
    });
    firstLookup.unmount();

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
  });

  it("reports missing when there is nothing to look up", () => {
    const { result } = _renderLookup(undefined);

    expect(result.current.status).toBe("missing");
  });

  it("keeps the loaded manifest out of the persisted query cache", async () => {
    const pluginId = _addBundledPlugin();
    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    const queries = queryClient.getQueryCache().getAll();

    expect(queries[0]?.meta).toEqual({ persist: false });
  });
});
