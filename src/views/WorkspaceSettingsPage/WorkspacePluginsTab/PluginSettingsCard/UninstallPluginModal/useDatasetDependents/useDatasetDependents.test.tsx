import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

type QueryFlags = { isFetching: boolean; isError: boolean };

const mocks = vi.hoisted(() => {
  return {
    linkedDatasets: [] as Array<{ id: string; name: string }>,
    bindings: [] as Array<{
      id: string;
      installationId: string;
      slotId: string;
    }>,
    installations: [] as Array<{ id: string; pluginId: string }>,
    bindingsFlags: { isFetching: false, isError: false } as QueryFlags,
    installationsFlags: { isFetching: false, isError: false } as QueryFlags,
    bindingsArgs: undefined as unknown,
    installationsArgs: undefined as unknown,
  };
});

vi.mock("@/hooks/datasets/useLinkedDatasets/useLinkedDatasets", () => {
  return {
    useLinkedDatasets: () => {
      return { linkedDatasets: mocks.linkedDatasets, isLoading: false };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return {
      PluginDataSlotBindingClient: {
        useGetAll: (args: unknown) => {
          mocks.bindingsArgs = args;
          return [mocks.bindings, false, mocks.bindingsFlags];
        },
      },
    };
  },
);
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        useGetAll: (args: unknown) => {
          mocks.installationsArgs = args;
          return [mocks.installations, false, mocks.installationsFlags];
        },
      },
    };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id" };
    },
  };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests",
  () => {
    return {
      useBundledPluginManifests: () => {
        return [
          {
            hasFailures: false,
            manifestModules: [
              {
                manifest: {
                  id: "avandar.epidemiology",
                  name: "%plugin.name%",
                  dataSlots: { cases: { title: "%slot.cases.title%" } },
                },
                strings: {
                  en: {
                    "plugin.name": "Epidemiology",
                    "slot.cases.title": "Cases",
                  },
                },
              },
            ],
          },
          false,
        ];
      },
    };
  },
);

const UNINSTALLING = "installation-mozambique" as PluginInstallation.Id;

function _renderDependents() {
  return renderHook(
    () => {
      return useDatasetDependents({
        datasetId: "dataset-districts" as Dataset.Id,
        installationId: UNINSTALLING,
      });
    },
    { wrapper: TestProviders },
  );
}

describe("useDatasetDependents", () => {
  beforeEach(() => {
    mocks.linkedDatasets = [];
    mocks.bindings = [];
    mocks.installations = [
      { id: "installation-epi", pluginId: "avandar.epidemiology" },
      { id: "installation-other", pluginId: "acme.unbundled" },
      { id: UNINSTALLING, pluginId: "avandar.mozambique" },
    ];
    mocks.bindingsFlags = { isFetching: false, isError: false };
    mocks.installationsFlags = { isFetching: false, isError: false };
    mocks.bindingsArgs = undefined;
    mocks.installationsArgs = undefined;
  });

  it("lists the linked datasets that read the dataset", () => {
    mocks.linkedDatasets = [
      { id: "linked-1", name: "Districts with population" },
    ];

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([
      {
        key: "linked-1",
        kind: "linkedDataset",
        label: "Districts with population",
      },
    ]);
  });

  it("labels another plugin's data slot with the plugin and slot names", () => {
    mocks.bindings = [
      { id: "binding-1", installationId: "installation-epi", slotId: "cases" },
    ];

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([
      { key: "binding-1", kind: "dataSlot", label: "Epidemiology: Cases" },
    ]);
  });

  it("leaves out the bindings of the plugin being uninstalled", () => {
    mocks.bindings = [
      {
        id: "binding-own",
        installationId: UNINSTALLING,
        slotId: "boundaries",
      },
    ];

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([]);
  });

  it("falls back to the plugin id and slot id for a plugin with no manifest in this build", () => {
    mocks.bindings = [
      { id: "binding-2", installationId: "installation-other", slotId: "rows" },
    ];

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([
      { key: "binding-2", kind: "dataSlot", label: "acme.unbundled: rows" },
    ]);
  });

  it("falls back to the slot id for a slot the manifest does not declare", () => {
    mocks.bindings = [
      {
        id: "binding-3",
        installationId: "installation-epi",
        slotId: "constructor",
      },
    ];

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([
      {
        key: "binding-3",
        kind: "dataSlot",
        label: "Epidemiology: constructor",
      },
    ]);
  });

  it("refetches the bindings and the installs on mount", () => {
    _renderDependents();

    expect(mocks.bindingsArgs).toMatchObject({
      where: { dataset_id: { eq: "dataset-districts" } },
      useQueryOptions: { refetchOnMount: "always" },
    });
    expect(mocks.installationsArgs).toMatchObject({
      where: { workspace_id: { eq: "workspace-id" } },
      useQueryOptions: { refetchOnMount: "always" },
    });
  });

  it("lists no data slot and reports loading while the bindings refetch", () => {
    mocks.bindings = [
      { id: "binding-1", installationId: "installation-epi", slotId: "cases" },
    ];
    mocks.bindingsFlags = { isFetching: true, isError: false };

    const { result } = _renderDependents();

    expect(result.current.dependents).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("reports loading while the installs refetch", () => {
    mocks.installationsFlags = { isFetching: true, isError: false };

    const { result } = _renderDependents();

    expect(result.current.isLoading).toBe(true);
  });

  it("reports a failure and lists no data slot when the bindings refetch fails", () => {
    mocks.bindings = [
      { id: "binding-1", installationId: "installation-epi", slotId: "cases" },
    ];
    mocks.bindingsFlags = { isFetching: false, isError: true };

    const { result } = _renderDependents();

    expect(result.current.hasFailed).toBe(true);
    expect(result.current.dependents).toEqual([]);
  });

  it("is settled and has not failed once everything loads", () => {
    const { result } = _renderDependents();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasFailed).toBe(false);
  });
});
