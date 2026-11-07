import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  created_at: "2026-11-06T10:00:00+00:00",
  granted_permissions: ["data:context"],
  id: "a700a001-0000-4000-8000-000000000001",
  installed_by: null,
  installed_version: "0.1.0",
  is_enabled: true,
  plugin_id: "avandar.epidemiology",
  updated_at: "2026-11-06T10:00:00+00:00",
  workspace_id: "a7001001-0000-4000-8000-000000000001",
};

describe("PluginInstallationParsers", () => {
  it("reads a database row into camel case with a null installer left undefined", () => {
    const model = PluginInstallationParsers.fromDBReadToModelRead(DB_ROW);
    expect(model.pluginId).toBe("avandar.epidemiology");
    expect(model.grantedPermissions).toEqual(["data:context"]);
    expect(model.installedBy).toBeUndefined();
    expect(model.isEnabled).toBe(true);
  });

  it("writes an insert in snake case that omits installed_by and the other unset fields", () => {
    const insert = PluginInstallationParsers.fromModelInsertToDBInsert(
      Model.make("PluginInstallation", {
        grantedPermissions: ["data:context"],
        installedVersion: "0.1.0",
        pluginId: "avandar.epidemiology",
        workspaceId: DB_ROW.workspace_id as Workspace.Id,
      }) as PluginInstallation.T<"Insert">,
    );
    expect(insert).toMatchObject({
      granted_permissions: ["data:context"],
      installed_version: "0.1.0",
      plugin_id: "avandar.epidemiology",
      workspace_id: DB_ROW.workspace_id,
    });
    expect(insert).not.toHaveProperty("installed_by");
  });
});
