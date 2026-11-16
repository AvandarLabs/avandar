import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { PluginInstallationClient } = await import("./PluginInstallationClient");

const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const DATE_COLUMN_ID = uuid();

const INSTALL_ROW = {
  created_at: "2026-11-11T10:00:00+00:00",
  granted_permissions: ["data:slots"],
  id: uuid(),
  installed_by: uuid(),
  installed_version: "0.2.0",
  is_enabled: true,
  plugin_id: "avandar.epidemiology",
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: WORKSPACE_ID,
};

describe("PluginInstallationClient.install", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: INSTALL_ROW });
      },
    });
  });

  it("sends each binding to the install RPC with null for the unused source", async () => {
    await PluginInstallationClient.install({
      workspaceId: WORKSPACE_ID,
      pluginId: "avandar.epidemiology",
      installedVersion: "0.2.0",
      grantedPermissions: ["data:slots"],
      bindings: [
        {
          slotId: "cases",
          sourceType: "dataset",
          conceptId: undefined,
          datasetId: DATASET_ID,
          attributeMap: { onsetDate: DATE_COLUMN_ID },
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_plugin_installations__install", {
      p_workspace_id: WORKSPACE_ID,
      p_plugin_id: "avandar.epidemiology",
      p_installed_version: "0.2.0",
      p_granted_permissions: ["data:slots"],
      p_bindings: [
        {
          slot_id: "cases",
          source_type: "dataset",
          concept_id: null,
          dataset_id: DATASET_ID,
          attribute_map: { onsetDate: DATE_COLUMN_ID },
        },
      ],
    });
  });

  it("returns the new install as a model", async () => {
    const installation = await PluginInstallationClient.install({
      workspaceId: WORKSPACE_ID,
      pluginId: "avandar.epidemiology",
      installedVersion: "0.2.0",
      grantedPermissions: ["data:slots"],
      bindings: [],
    });

    expect(installation).toMatchObject({
      id: INSTALL_ROW.id,
      pluginId: "avandar.epidemiology",
      grantedPermissions: ["data:slots"],
    });
  });
});
