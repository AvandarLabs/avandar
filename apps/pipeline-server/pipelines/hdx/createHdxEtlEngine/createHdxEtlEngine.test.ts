import { createInMemoryListingsStore } from "@avandar/etl";
import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { describe, expect, it, vi } from "vitest";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};
const OUTPUT = {
  listingsTable: "data_catalog_listings",
  relationColumnsTable: "data_catalog_listings__relation_columns",
};

function _package(name: string, day: number): CkanPackage {
  return {
    id: name,
    name,
    metadata_modified: `2026-10-${String(day).padStart(2, "0")}T00:00:00.000`,
    resources: [
      {
        id: `${name}-csv`,
        name: `${name}.csv`,
        format: "CSV",
        url: `https://data.humdata.org/dataset/${name}/resource/${name}-csv/download/${name}.csv`,
        url_type: "upload",
        size: 100,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
      },
    ],
  };
}

/** A one-page fake `package_search` that applies `modifiedSince`. */
function _discovery(catalog: readonly CkanPackage[]): CkanDiscoveryClient {
  return {
    searchDatasets: vi.fn(async ({ modifiedSince }) => {
      const datasets = catalog.filter((dataset) => {
        return (
          modifiedSince === undefined ||
          parseCkanTimestamp(dataset.metadata_modified ?? "").getTime() >=
            modifiedSince.getTime()
        );
      });
      const lastDataset = datasets.at(-1);
      return {
        datasets,
        skippedDatasets: [],
        nextCursor:
          lastDataset === undefined ? undefined : (
            {
              modifiedAt: parseCkanTimestamp(
                lastDataset.metadata_modified ?? "",
              ),
              name: lastDataset.name,
            }
          ),
        resultCount: datasets.length,
      };
    }),
  };
}

describe("createHdxEtlEngine", () => {
  it("writes one listing per readable resource, dated by metadata_modified", async () => {
    const listings = createInMemoryListingsStore();

    await createHdxEtlEngine({
      output: OUTPUT,
      discovery: _discovery([_package("a", 1), _package("b", 2)]),
      drive: DRIVE,
      stores: { listings, objects: undefined },
    }).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [
          row.pipeline_name,
          row.api_service,
          row.api_resource_id,
          row.date_of_last_update,
        ];
      }),
    ).toEqual([
      ["hdx", "ckan", "a-csv", "2026-10-01T00:00:00.000Z"],
      ["hdx", "ckan", "b-csv", "2026-10-02T00:00:00.000Z"],
    ]);
  });

  it("asks an incremental run for datasets modified since the newest stored one", async () => {
    const listings = createInMemoryListingsStore();
    const engineArgs = {
      output: OUTPUT,
      drive: DRIVE,
      stores: { listings, objects: undefined },
    };
    await createHdxEtlEngine({
      ...engineArgs,
      discovery: _discovery([_package("a", 1), _package("b", 2)]),
    }).run({ mode: "full" });
    const discovery = _discovery([
      _package("a", 1),
      _package("b", 2),
      _package("c", 3),
    ]);

    const report = await createHdxEtlEngine({ ...engineArgs, discovery }).run({
      mode: "incremental",
    });

    expect([
      vi.mocked(discovery.searchDatasets).mock.calls[0]?.[0].modifiedSince,
      report.drives[0]?.relationsWritten,
    ]).toEqual([new Date("2026-10-02T00:00:00.000Z"), 1]);
  });

  it("crawls nothing when no HDX drive is configured", async () => {
    const discovery = _discovery([_package("a", 1)]);

    const report = await createHdxEtlEngine({
      output: OUTPUT,
      discovery,
      drive: undefined,
      stores: { listings: createInMemoryListingsStore(), objects: undefined },
    }).run({ mode: "full" });

    expect([
      report.drives,
      vi.mocked(discovery.searchDatasets).mock.calls.length,
    ]).toEqual([[], 0]);
  });
});
