import { readGhoIndicatorSchemas } from "@pipelines/gho/readGhoIndicatorSchemas/readGhoIndicatorSchemas";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";

const GHO_BASE_URL = "https://ghoapi.azureedge.net/api";

/** A trimmed `$metadata` in GHO's own shape: one line, `Default` namespace. */
const METADATA =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">' +
  '<edmx:DataServices><Schema Namespace="Default" xmlns="http://docs.oasis-open.org/odata/ns/edm">' +
  '<EntityType Name="DIMENSION"><Key><PropertyRef Name="Code" /></Key>' +
  '<Property Name="Code" Type="Edm.String" Nullable="false" />' +
  '<NavigationProperty Name="DimensionValues" Type="Collection(Default.DIMENSION_VALUE)" /></EntityType>' +
  '<EntityType Name="WHS3_62_TYPE"><Key><PropertyRef Name="Id" /></Key>' +
  '<Property Name="Id" Type="Edm.Int64" Nullable="false" />' +
  '<Property Name="Date" Type="Edm.DateTimeOffset" />' +
  '<NavigationProperty Name="Indicator" Type="Default.DIMENSION_VALUE">' +
  '<ReferentialConstraint Property="IndicatorCode" ReferencedProperty="Code" /></NavigationProperty>' +
  "</EntityType>" +
  '<EntityContainer Name="Container">' +
  '<EntitySet Name="DIMENSION" EntityType="Default.DIMENSION" />' +
  '<EntitySet Name="WHS3_62" EntityType="Default.WHS3_62_TYPE">' +
  '<NavigationPropertyBinding Path="Indicator" Target="DIMENSION" /></EntitySet>' +
  "</EntityContainer></Schema></edmx:DataServices></edmx:Edmx>";

function _httpAnswering(body: string): OpenDataHttp {
  return {
    get: vi.fn(),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode(body) as Uint8Array<ArrayBuffer>;
    }),
  };
}

describe("readGhoIndicatorSchemas", () => {
  it("reads each entity set's properties through its entity type", async () => {
    const http = _httpAnswering(METADATA);

    const schemas = await readGhoIndicatorSchemas({
      http,
      baseUrl: GHO_BASE_URL,
    });

    expect([
      vi.mocked(http.getBytes).mock.calls[0]?.[0],
      schemas.get("WHS3_62"),
    ]).toEqual([
      `${GHO_BASE_URL}/$metadata`,
      [
        { name: "Id", edmType: "Edm.Int64" },
        { name: "Date", edmType: "Edm.DateTimeOffset" },
      ],
    ]);
  });

  it("fails when the document declares no entity type", async () => {
    await expect(
      readGhoIndicatorSchemas({
        http: _httpAnswering("<html>Service unavailable</html>"),
        baseUrl: GHO_BASE_URL,
      }),
    ).rejects.toThrow(/\$metadata/);
  });

  it("fails when the document cannot be read", async () => {
    const http: OpenDataHttp = {
      get: vi.fn(),
      getBytes: vi.fn().mockRejectedValue(new Error("HTTP 500")),
    };

    await expect(
      readGhoIndicatorSchemas({ http, baseUrl: GHO_BASE_URL }),
    ).rejects.toThrow(/\$metadata/);
  });
});
