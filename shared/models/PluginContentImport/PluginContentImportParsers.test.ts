import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImportParsers.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { PluginContentImport } from "$/models/PluginContentImport/PluginContentImport.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  content_id: "provinces",
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: "d1606001-0000-4000-8000-000000000001",
  id: "d160c001-0000-4000-8000-000000000001",
  imported_by: null,
  plugin_id: "avandar.mozambique",
  workspace_id: "d1601001-0000-4000-8000-000000000001",
};

describe("PluginContentImportParsers", () => {
  it("reads a database row into camel case with a null importer left undefined", () => {
    const model = PluginContentImportParsers.fromDBReadToModelRead(DB_ROW);
    expect(model).toMatchObject({
      contentId: "provinces",
      datasetId: DB_ROW.dataset_id,
      pluginId: "avandar.mozambique",
    });
    expect(model.importedBy).toBeUndefined();
  });

  it("writes an insert in snake case that omits imported_by when it is unset", () => {
    const insert = PluginContentImportParsers.fromModelInsertToDBInsert(
      Model.make("PluginContentImport", {
        contentId: "districts",
        datasetId: DB_ROW.dataset_id as Dataset.Id,
        importedBy: undefined,
        pluginId: "avandar.mozambique",
        workspaceId: DB_ROW.workspace_id as Workspace.Id,
      }) as PluginContentImport.T<"Insert">,
    );
    expect(insert).toEqual({
      content_id: "districts",
      dataset_id: DB_ROW.dataset_id,
      plugin_id: "avandar.mozambique",
      workspace_id: DB_ROW.workspace_id,
    });
  });
});
