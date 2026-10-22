import { readHdxResourceColumns } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";
import { describe, expect, it, vi } from "vitest";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { RelationColumn } from "@avandar/etl";

const SNIFFED: RelationColumn[] = [
  { name: "year", originalDataType: "BIGINT", castDataType: "BIGINT" },
];

function _resource(fileHeaders?: readonly string[]): CkanResource {
  return {
    id: "csv-1",
    name: "data.csv",
    format: "CSV",
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

describe("readHdxResourceColumns", () => {
  it("names the columns from HDX's headers as unverified text, without reading the file", async () => {
    const readFileColumns = vi.fn(async () => {
      return SNIFFED;
    });

    const columns = await readHdxResourceColumns({
      resource: _resource(["adm1", "value"]),
      readFileColumns,
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
    "reads the file's columns, verified, when HDX recorded %s",
    async (_label, headers) => {
      const columns = await readHdxResourceColumns({
        resource: _resource(headers),
        readFileColumns: async () => {
          return SNIFFED;
        },
      });

      expect(columns).toEqual({
        columns: SNIFFED,
        columnTypesVerifiedAt: expect.any(Date),
      });
    },
  );

  it("returns undefined when the file's columns cannot be read either", async () => {
    const columns = await readHdxResourceColumns({
      resource: _resource(),
      readFileColumns: async () => {
        return undefined;
      },
    });

    expect(columns).toBeUndefined();
  });
});
