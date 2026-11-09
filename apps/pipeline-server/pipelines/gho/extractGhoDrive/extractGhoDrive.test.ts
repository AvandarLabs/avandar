import {
  createFakeGhoApi,
  FAKE_GHO_BASE_URL,
} from "@pipelines/gho/__tests__/ghoFakeApi.fixtures";
import { extractGhoDrive } from "@pipelines/gho/extractGhoDrive/extractGhoDrive";
import { readGhoIndicatorSchemas } from "@pipelines/gho/readGhoIndicatorSchemas/readGhoIndicatorSchemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FakeGhoDimension,
  FakeGhoIndicator,
} from "@pipelines/gho/__tests__/ghoFakeApi.fixtures";
import type { GhoConnection, GhoScope } from "@pipelines/gho/gho.types";

const MEASLES: FakeGhoIndicator = {
  code: "WHS3_62",
  name: "Measles - number of reported cases",
  rows: [
    {
      Date: "2024-01-05T10:00:00+01:00",
      SpatialDimType: "COUNTRY",
      Dim1Type: null,
    },
    { Date: "2023-06-01T00:00:00Z", SpatialDimType: "REGION", Dim1Type: "SEX" },
  ],
};

async function _extract(args: {
  scopeKey: GhoScope["key"];
  indicators?: readonly FakeGhoIndicator[];
  dimensions?: readonly FakeGhoDimension[];
  batchSize?: number;
}): Promise<{ pages: GhoConnection[][]; requestedUrls: string[] }> {
  const api = createFakeGhoApi(args);
  const indicatorSchemas = await readGhoIndicatorSchemas({
    http: api.http,
    baseUrl: FAKE_GHO_BASE_URL,
  });
  const pages: GhoConnection[][] = [];
  const extraction = extractGhoDrive({
    drive: {
      baseUrl: FAKE_GHO_BASE_URL,
      organizationLabels: {},
      indicatorSchemas,
      checkedAt: new Date("2026-11-09T06:00:00.000Z"),
    },
    scope: { key: args.scopeKey },
    http: api.http,
    ...(args.batchSize === undefined ? {} : { batchSize: args.batchSize }),
  });
  for await (const page of extraction) {
    pages.push([...page]);
  }
  return { pages, requestedUrls: api.requestedUrls };
}

describe("extractGhoDrive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("probes each indicator for its row count and newest rows", async () => {
    const { pages } = await _extract({
      scopeKey: "indicators",
      indicators: [MEASLES],
    });

    expect(pages).toEqual([
      [
        {
          kind: "indicator",
          code: "WHS3_62",
          name: "Measles - number of reported cases",
          sourceRecord: {
            IndicatorCode: "WHS3_62",
            IndicatorName: "Measles - number of reported cases",
            Language: "EN",
          },
          rowCount: 2,
          probeRows: [
            {
              Date: "2024-01-05T10:00:00+01:00",
              SpatialDimType: "COUNTRY",
              Dim1Type: null,
              Dim2Type: null,
              Dim3Type: null,
              DataSourceDimType: null,
            },
            {
              Date: "2023-06-01T00:00:00Z",
              SpatialDimType: "REGION",
              Dim1Type: "SEX",
              Dim2Type: null,
              Dim3Type: null,
              DataSourceDimType: null,
            },
          ],
          hasFactSchema: true,
        },
      ],
    ]);
  });

  it("asks for the 1,000 newest rows' Date and dimension types, with the count", async () => {
    const { requestedUrls } = await _extract({
      scopeKey: "indicators",
      indicators: [MEASLES],
    });

    expect(requestedUrls).toContain(
      `${FAKE_GHO_BASE_URL}/WHS3_62?$orderby=Date%20desc&$top=1000&$select=Date,SpatialDimType,Dim1Type,Dim2Type,Dim3Type,DataSourceDimType&$count=true`,
    );
  });

  it("yields one page per batch of indicators", async () => {
    const indicators = ["A", "B", "C"].map((code) => {
      return { code, name: `Indicator ${code}` };
    });

    const { pages } = await _extract({
      scopeKey: "indicators",
      indicators,
      batchSize: 2,
    });

    expect(
      pages.map((page) => {
        return page.map((connection) => {
          return connection.code;
        });
      }),
    ).toEqual([["A", "B"], ["C"]]);
  });

  it("probes a batch's indicators at once, and keeps them in order", async () => {
    const codes = ["A", "B", "C"];
    const api = createFakeGhoApi({
      indicators: codes.map((code) => {
        return { code, name: `Indicator ${code}` };
      }),
    });
    const indicatorSchemas = await readGhoIndicatorSchemas({
      http: api.http,
      baseUrl: FAKE_GHO_BASE_URL,
    });
    let numInFlight = 0;
    let maxInFlight = 0;
    const http = {
      ...api.http,
      get: async (url: string) => {
        if (!url.includes("$orderby")) {
          return await api.http.get(url);
        }
        numInFlight += 1;
        maxInFlight = Math.max(maxInFlight, numInFlight);
        // Later indicators answer first, so order must not come from timing.
        const delayMs =
          (codes.length -
            codes.indexOf(url.split("/").at(-1)!.split("?")[0]!)) *
          10;
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
        numInFlight -= 1;
        return await api.http.get(url);
      },
    };

    const pages: GhoConnection[][] = [];
    for await (const page of extractGhoDrive({
      drive: {
        baseUrl: FAKE_GHO_BASE_URL,
        organizationLabels: {},
        indicatorSchemas,
        checkedAt: new Date("2026-11-09T06:00:00.000Z"),
      },
      scope: { key: "indicators" },
      http,
    })) {
      pages.push([...page]);
    }

    expect(maxInFlight).toBe(codes.length);
    expect(
      pages.flat().map((connection) => {
        return connection.code;
      }),
    ).toEqual(codes);
  });

  it("marks an indicator whose entity type drifted, and warns about it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { pages } = await _extract({
      scopeKey: "indicators",
      indicators: [
        { ...MEASLES, properties: [{ name: "Id", edmType: "Edm.String" }] },
      ],
    });

    expect([
      pages[0]?.[0]?.kind === "indicator" && pages[0][0].hasFactSchema,
      String(warn.mock.calls[0]?.[0]),
    ]).toEqual([false, expect.stringContaining("WHS3_62")]);
  });

  it("skips an indicator whose probe fails, with a warning, and keeps the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = createFakeGhoApi({ indicators: [MEASLES] });
    const indicatorSchemas = await readGhoIndicatorSchemas({
      http: api.http,
      baseUrl: FAKE_GHO_BASE_URL,
    });
    const http = {
      get: vi.fn(async (url: string) => {
        if (url.endsWith("/Indicator")) {
          return {
            value: [
              { IndicatorCode: "GONE", IndicatorName: "Gone" },
              { IndicatorCode: "WHS3_62", IndicatorName: MEASLES.name },
            ],
          };
        }
        return await api.http.get(url);
      }),
      getBytes: api.http.getBytes,
    };

    const pages: GhoConnection[][] = [];
    for await (const page of extractGhoDrive({
      drive: {
        baseUrl: FAKE_GHO_BASE_URL,
        organizationLabels: {},
        indicatorSchemas,
        checkedAt: new Date(),
      },
      scope: { key: "indicators" },
      http,
    })) {
      pages.push([...page]);
    }

    expect([
      pages.flat().map((connection) => {
        return connection.code;
      }),
      String(warn.mock.calls[0]?.[0]),
    ]).toEqual([["WHS3_62"], expect.stringContaining("GONE")]);
  });

  it("probes each dimension's value list for its value count", async () => {
    const { pages, requestedUrls } = await _extract({
      scopeKey: "dimensions",
      dimensions: [
        {
          code: "COUNTRY",
          title: "Country",
          values: [{ Code: "SDN" }, { Code: "TCD" }],
        },
        { code: "EMPTY", title: "Empty", values: [] },
      ],
    });

    expect([
      pages.flat().map((connection) => {
        return connection.kind === "dimension"
          ? [connection.code, connection.title, connection.valueCount]
          : undefined;
      }),
      requestedUrls.includes(
        `${FAKE_GHO_BASE_URL}/DIMENSION/COUNTRY/DimensionValues`,
      ),
    ]).toEqual([
      [
        ["COUNTRY", "Country", 2],
        ["EMPTY", "Empty", 0],
      ],
      true,
    ]);
  });
});
