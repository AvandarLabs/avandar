import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  attribute_map: {
    onsetDate: "d1507001-0000-4000-8000-000000000001",
    district_2: "d1507002-0000-4000-8000-000000000002",
  },
  bound_by: null,
  concept_id: "d1504001-0000-4000-8000-000000000001",
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: null,
  id: "d150b001-0000-4000-8000-000000000001",
  installation_id: "d150a001-0000-4000-8000-000000000001",
  slot_id: "cases",
  source_type: "concept" as const,
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: "d1501001-0000-4000-8000-000000000001",
};

describe("PluginDataSlotBindingParsers", () => {
  describe("reading a database row", () => {
    it("keeps the attribute map's keys exactly as stored", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead(DB_ROW);
      expect(model.attributeMap).toEqual({
        onsetDate: "d1507001-0000-4000-8000-000000000001",
        district_2: "d1507002-0000-4000-8000-000000000002",
      });
    });

    it("reads a null dataset_id and bound_by as undefined", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead(DB_ROW);
      expect(model.datasetId).toBeUndefined();
      expect(model.boundBy).toBeUndefined();
    });

    it("drops attribute map entries whose value is not a string", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead({
        ...DB_ROW,
        attribute_map: { onsetDate: 42, district: "d1507002" },
      });
      expect(model.attributeMap).toEqual({ district: "d1507002" });
    });

    it("reads an attribute map that is not an object as empty", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead({
        ...DB_ROW,
        attribute_map: ["onsetDate"],
      });
      expect(model.attributeMap).toEqual({});
    });
  });

  describe("inserting a model", () => {
    const insert = () => {
      return PluginDataSlotBindingParsers.fromModelInsertToDBInsert(
        Model.make("PluginDataSlotBinding", {
          attributeMap: { onsetDate: "d1507001" },
          conceptId: undefined,
          datasetId: undefined,
          installationId: DB_ROW.installation_id as PluginInstallation.Id,
          slotId: "cases",
          sourceType: "dataset",
          workspaceId: DB_ROW.workspace_id as Workspace.Id,
        }) as PluginDataSlotBinding.T<"Insert">,
      );
    };

    it("writes the attribute map's keys exactly as given", () => {
      expect(insert().attribute_map).toEqual({ onsetDate: "d1507001" });
    });

    it("writes the other fields in snake case", () => {
      expect(insert()).toMatchObject({
        installation_id: DB_ROW.installation_id,
        slot_id: "cases",
        source_type: "dataset",
        workspace_id: DB_ROW.workspace_id,
      });
    });

    it("sends no concept_id or dataset_id key when both are undefined", () => {
      expect(insert()).not.toHaveProperty("concept_id");
      expect(insert()).not.toHaveProperty("dataset_id");
    });
  });

  describe("updating a model", () => {
    it("sends only the attribute map when only the map changes", () => {
      const update = PluginDataSlotBindingParsers.fromModelUpdateToDBUpdate({
        attributeMap: { onsetDate: "d1507009" },
      });
      expect(update).toEqual({ attribute_map: { onsetDate: "d1507009" } });
    });
  });
});
