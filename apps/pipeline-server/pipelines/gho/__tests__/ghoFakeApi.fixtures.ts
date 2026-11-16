import { GHO_FACT_COLUMNS } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types";
import type { GhoEdmProperty } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";

/** GHO's base URL, as the fake API serves it. */
export const FAKE_GHO_BASE_URL = "https://ghoapi.azureedge.net/api";

/** One fake indicator: its record and its fact rows, newest first. */
export type FakeGhoIndicator = Readonly<{
  code: string;
  name: string;
  rows?: ReadonlyArray<Readonly<Record<string, string | number | null>>>;
  /** Replaces its declared properties in `$metadata`. */
  properties?: readonly GhoEdmProperty[];
}>;

/** One fake dimension and its value list. */
export type FakeGhoDimension = Readonly<{
  code: string;
  title: string;
  values?: ReadonlyArray<Readonly<Record<string, string | null>>>;
}>;

/** A fake GHO API, and every URL it was asked for. */
export type FakeGhoApi = Readonly<{
  http: OpenDataHttp;
  requestedUrls: string[];
}>;

const PROBE_FIELDS = [
  "Date",
  "SpatialDimType",
  "Dim1Type",
  "Dim2Type",
  "Dim3Type",
  "DataSourceDimType",
];

function _buildMetadataXml(indicators: readonly FakeGhoIndicator[]): string {
  const factProperties = GHO_FACT_COLUMNS.map((column) => {
    return { name: column.name, edmType: column.originalDataType };
  });
  const entityTypes = indicators.map((indicator) => {
    const properties = (indicator.properties ?? factProperties).map(
      (property) => {
        return `<Property Name="${property.name}" Type="${property.edmType}" />`;
      },
    );
    return `<EntityType Name="${indicator.code}">${properties.join("")}</EntityType>`;
  });
  const entitySets = indicators.map((indicator) => {
    return `<EntitySet Name="${indicator.code}" EntityType="Default.${indicator.code}" />`;
  });
  // Like GHO's, it always declares the DIMENSION entity set.
  return (
    '<edmx:Edmx Version="4.0"><edmx:DataServices><Schema Namespace="Default">' +
    '<EntityType Name="DIMENSION"><Property Name="Code" Type="Edm.String" />' +
    `</EntityType>${entityTypes.join("")}<EntityContainer Name="C">` +
    '<EntitySet Name="DIMENSION" EntityType="Default.DIMENSION" />' +
    `${entitySets.join("")}</EntityContainer></Schema></edmx:DataServices>` +
    "</edmx:Edmx>"
  );
}

function _buildProbeBody(indicator: FakeGhoIndicator, url: URL): unknown {
  const rows = indicator.rows ?? [];
  const top = Number(url.searchParams.get("$top") ?? rows.length);
  return {
    "@odata.count": rows.length,
    value: rows.slice(0, top).map((row) => {
      return Object.fromEntries(
        PROBE_FIELDS.map((field) => {
          return [field, row[field] ?? null];
        }),
      );
    }),
  };
}

function _answer(
  args: Readonly<{
    url: URL;
    indicators: readonly FakeGhoIndicator[];
    dimensions: readonly FakeGhoDimension[];
  }>,
): Response {
  const path = args.url.pathname.replace(/^\/api\//, "");
  if (path === "$metadata") {
    return new Response(_buildMetadataXml(args.indicators));
  }
  if (path === "Indicator") {
    const value = args.indicators.map((indicator) => {
      return {
        IndicatorCode: indicator.code,
        IndicatorName: indicator.name,
        Language: "EN",
      };
    });
    return Response.json({ value });
  }
  if (path === "Dimension") {
    const value = args.dimensions.map((dimension) => {
      return { Code: dimension.code, Title: dimension.title };
    });
    return Response.json({ value });
  }
  const dimension = args.dimensions.find((candidate) => {
    return path === `DIMENSION/${candidate.code}/DimensionValues`;
  });
  if (dimension !== undefined) {
    return Response.json({ value: dimension.values ?? [] });
  }
  const indicator = args.indicators.find((candidate) => {
    return path === candidate.code;
  });
  return indicator === undefined
    ? new Response("not found", { status: 404 })
    : Response.json(_buildProbeBody(indicator, args.url));
}

/**
 * A fake GHO OData API, behind a real HttpClient with no rate limit, so a
 * test reads GHO's response shapes offline. Used by the GHO pipeline's
 * extract and engine tests.
 */
export function createFakeGhoApi(
  args: Readonly<{
    indicators?: readonly FakeGhoIndicator[];
    dimensions?: readonly FakeGhoDimension[];
    /** Answers `$metadata` with this status instead. */
    metadataStatus?: number;
  }>,
): FakeGhoApi {
  const requestedUrls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    requestedUrls.push(url);
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith("$metadata") && args.metadataStatus) {
      return new Response("unavailable", { status: args.metadataStatus });
    }
    return _answer({
      url: parsedUrl,
      indicators: args.indicators ?? [],
      dimensions: args.dimensions ?? [],
    });
  };
  const http = HttpClientFactory.create("FakeGhoHttpClient", {
    state: { maxResponseBytes: 64 * 1024 * 1024, fetchImpl },
  });
  return { http, requestedUrls };
}
