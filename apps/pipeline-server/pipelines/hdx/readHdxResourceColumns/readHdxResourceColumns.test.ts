import { readHdxResourceColumns } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";
import { describe, expect, it, vi } from "vitest";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { EtlPipelineMetrics, RelationColumn } from "@avandar/etl";

const SNIFFED: RelationColumn[] = [
  { name: "year", originalDataType: "BIGINT", castDataType: "BIGINT" },
];

function _resource(
  fileHeaders?: readonly string[],
  format = "Parquet",
): CkanResource {
  return {
    id: "res-1",
    name: "data",
    format,
    url: "https://data.humdata.org/dataset/x/resource/csv-1/download/data.csv",
    url_type: "upload",
    size: 200,
    hash: "abc",
    last_modified: undefined,
    mimetype: undefined,
    datastore_active: false,
    ...(fileHeaders === undefined ? {} : { fileHeaders }),
  };
}

function _metrics() {
  const values: Record<string, number> = {};
  const metrics: EtlPipelineMetrics = {
    increment: (name, by = 1) => {
      values[name] = (values[name] ?? 0) + by;
    },
    time: async (name, work) => {
      values[name] = (values[name] ?? 0) + 1;
      return work();
    },
  };
  return { metrics, values };
}

describe("readHdxResourceColumns", () => {
  it("names the columns from HDX's headers as unverified text, without reading the file", async () => {
    const readFileColumns = vi.fn(async () => {
      return SNIFFED;
    });

    const columns = await readHdxResourceColumns({
      resource: _resource(["adm1", "value"]),
      readFileColumns,
      metrics: _metrics().metrics,
    });

    expect(columns).toEqual({
      columns: [
        { name: "adm1", originalDataType: "unknown", castDataType: "VARCHAR" },
        { name: "value", originalDataType: "unknown", castDataType: "VARCHAR" },
      ],
      columnTypesVerifiedAt: undefined,
    });
    expect(readFileColumns).not.toHaveBeenCalled();
  });

  it.each([
    ["no headers", undefined],
    ["a blank header", ["adm1", ""]],
    ["a header with surrounding spaces", ["adm1", " value"]],
    ["two headers that differ only in case", ["Value", "value"]],
  ])(
    "reads a Parquet file's columns, verified, when HDX recorded %s",
    async (_label, headers) => {
      const columns = await readHdxResourceColumns({
        resource: _resource(headers),
        readFileColumns: async () => {
          return SNIFFED;
        },
        metrics: _metrics().metrics,
      });

      expect(columns).toEqual({
        columns: SNIFFED,
        columnTypesVerifiedAt: expect.any(Date),
      });
    },
  );

  it("gives a CSV with no usable headers no columns, unverified, without reading it", async () => {
    const readFileColumns = vi.fn(async () => {
      return SNIFFED;
    });

    const columns = await readHdxResourceColumns({
      resource: _resource(undefined, "CSV"),
      readFileColumns,
      metrics: _metrics().metrics,
    });

    expect(columns).toEqual({ columns: [], columnTypesVerifiedAt: undefined });
    expect(readFileColumns).not.toHaveBeenCalled();
  });

  it("returns undefined when a Parquet file's columns cannot be read", async () => {
    const columns = await readHdxResourceColumns({
      resource: _resource(),
      readFileColumns: async () => {
        return undefined;
      },
      metrics: _metrics().metrics,
    });

    expect(columns).toBeUndefined();
  });

  it("counts and times each Parquet footer read", async () => {
    const { metrics, values } = _metrics();

    await readHdxResourceColumns({
      resource: _resource(undefined),
      readFileColumns: async () => {
        return SNIFFED;
      },
      metrics,
    });

    expect(values).toEqual({
      "hdx.parquet_footer_reads": 1,
      "hdx.parquet_footer_read_ms": 1,
    });
  });

  it("reads no footer, and records no metric, for headers HDX recorded", async () => {
    const { metrics, values } = _metrics();

    await readHdxResourceColumns({
      resource: _resource(["adm1"]),
      readFileColumns: async () => {
        return SNIFFED;
      },
      metrics,
    });

    expect(values).toEqual({});
  });
});
