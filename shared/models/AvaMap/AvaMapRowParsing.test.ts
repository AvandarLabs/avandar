import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { AvaMapParsers } from "$/models/AvaMap/AvaMapParsers.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { describe, expect, it } from "vitest";

function _makePopulatedConfig(): AvaMapConfig.T {
  const layer = MapLayer.makeEmpty("Cases");
  return AvaMapConfig.withLayerAdded(AvaMapConfig.makeEmpty(), {
    ...layer,
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<"QueryColumn">(),
      longitude: uuid<"QueryColumn">(),
    },
  });
}

describe("AvaMapParsers", () => {
  it("serializes insert config and nullable optional fields", () => {
    const config = _makePopulatedConfig();
    const model = Model.make("AvaMap", {
      config,
      description: undefined,
      name: "Cases",
      ownerId: uuid<"User">(),
      ownerProfileId: uuid<"UserProfile">(),
      slug: undefined,
      workspaceId: uuid<"Workspace">(),
    });

    const serialized = AvaMapParsers.fromModelInsertToDBInsert(model);

    expect(serialized).toMatchObject({
      config: AvaMapConfigSchema.toJson(config),
      description: null,
      slug: null,
    });
  });

  it("serializes config on update without changing map-owned keys", () => {
    const config = _makePopulatedConfig();

    const serialized = AvaMapParsers.fromModelUpdateToDBUpdate({ config });

    expect(serialized).toMatchObject({
      config: AvaMapConfigSchema.toJson(config),
    });
  });

  it("omits config when an update does not provide it", () => {
    const serialized = AvaMapParsers.fromModelUpdateToDBUpdate({
      name: "Updated cases",
    });

    expect(serialized).toEqual({ name: "Updated cases" });
  });

  it("parses a database row into a branded model with a typed config", () => {
    const config = AvaMapConfig.makeEmpty();
    const row = {
      config: AvaMapConfigSchema.toJson(config),
      created_at: "2026-08-14T12:00:00.000Z",
      description: null,
      id: "00000000-0000-4000-8000-000000000001",
      is_public: false,
      is_restricted: true,
      name: "Goma cases",
      owner_id: "00000000-0000-4000-8000-000000000002",
      owner_profile_id: "00000000-0000-4000-8000-000000000003",
      slug: null,
      updated_at: "2026-08-14T12:30:00.000Z",
      workspace_id: "00000000-0000-4000-8000-000000000004",
    };

    const model = AvaMapParsers.fromDBReadToModelRead(row);

    expect(model).toMatchObject({
      __type: "AvaMap",
      config,
      description: undefined,
      slug: undefined,
    });
    expect(model.config).toEqual(config);
    expect(model.config.__type).toBe("AvaMapConfig");
  });
});
