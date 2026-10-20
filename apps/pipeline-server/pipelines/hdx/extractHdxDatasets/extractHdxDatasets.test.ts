import { extractHdxDatasets } from "@pipelines/hdx/extractHdxDatasets/extractHdxDatasets";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp";
import type { EtlRunWindow } from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  CkanDatasetSearchPage,
  CkanDiscoveryClient,
} from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};
const OPEN_WINDOW: EtlRunWindow = { since: undefined, until: undefined };

afterEach(() => {
  vi.restoreAllMocks();
});

function _package(name: string, modified: string): CkanPackage {
  return { id: name, name, metadata_modified: modified, resources: [] };
}

const CATALOG: readonly CkanPackage[] = [
  _package("a", "2026-10-01T00:00:00.000"),
  _package("b", "2026-10-01T00:00:00.000"),
  _package("c", "2026-10-02T00:00:00.000"),
  _package("d", "2026-10-03T00:00:00.000"),
  _package("e", "2026-10-04T00:00:00.000"),
];

function _modifiedAt(dataset: CkanPackage): Date {
  return parseCkanTimestamp(dataset.metadata_modified ?? "");
}

/**
 * Builds a page the way the real client does: datasets named in
 * `invalidNames` are skipped, and the cursor sits on the last raw row.
 */
function _page(
  rawRows: readonly CkanPackage[],
  invalidNames: readonly string[] = [],
): CkanDatasetSearchPage {
  const lastRow = rawRows.at(-1);
  return {
    datasets: rawRows.filter((dataset) => {
      return !invalidNames.includes(dataset.name);
    }),
    skippedDatasets: rawRows
      .filter((dataset) => {
        return invalidNames.includes(dataset.name);
      })
      .map((dataset) => {
        return {
          name: dataset.name,
          metadataModified: dataset.metadata_modified ?? "",
          reason: "resources.0.format: Invalid",
        };
      }),
    nextCursor:
      lastRow === undefined ? undefined : (
        { modifiedAt: _modifiedAt(lastRow), name: lastRow.name }
      ),
    resultCount: rawRows.length,
  };
}

/** A fake `package_search` that applies the keyset cursor like CKAN does. */
function _keysetDiscovery(
  catalog: readonly CkanPackage[],
  invalidNames: readonly string[] = [],
): CkanDiscoveryClient {
  return {
    searchDatasets: vi.fn(async ({ after, rows }) => {
      const remaining =
        after === undefined ? catalog : (
          catalog.filter((dataset) => {
            const time = _modifiedAt(dataset).getTime();
            const afterTime = after.modifiedAt.getTime();
            return (
              time > afterTime ||
              (time === afterTime && dataset.name > after.name)
            );
          })
        );
      return _page(remaining.slice(0, rows), invalidNames);
    }),
  };
}

async function _collect(
  discovery: CkanDiscoveryClient,
  window: EtlRunWindow = OPEN_WINDOW,
): Promise<CkanPackage[][]> {
  const pages: CkanPackage[][] = [];
  // Sequential on purpose: the generator pages one request at a time.
  for await (const page of extractHdxDatasets({
    drive: DRIVE,
    window,
    discovery,
    pageSize: 2,
  })) {
    pages.push([...page]);
  }
  return pages;
}

function _names(pages: readonly CkanPackage[][]): string[] {
  return pages.flat().map((dataset) => {
    return dataset.name;
  });
}

function _silenceWarnings() {
  return vi.spyOn(console, "warn").mockImplementation(() => {
    return undefined;
  });
}

describe("extractHdxDatasets", () => {
  it("asks for the next page after the last page's (metadata_modified, name)", async () => {
    const discovery = _keysetDiscovery(CATALOG);

    await _collect(discovery);

    expect(
      vi.mocked(discovery.searchDatasets).mock.calls[1]?.[0].after,
    ).toEqual({
      modifiedAt: new Date("2026-10-01T00:00:00.000Z"),
      name: "b",
    });
  });

  it("returns every dataset exactly once", async () => {
    expect(_names(await _collect(_keysetDiscovery(CATALOG)))).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("drops rows at or before the cursor when the source repeats them", async () => {
    const repeating: CkanDiscoveryClient = {
      searchDatasets: vi
        .fn()
        .mockResolvedValueOnce(_page([CATALOG[0]!, CATALOG[1]!]))
        .mockResolvedValueOnce(_page([CATALOG[1]!, CATALOG[2]!]))
        .mockResolvedValueOnce(_page([CATALOG[3]!])),
    };

    expect(_names(await _collect(repeating))).toEqual(["a", "b", "c", "d"]);
  });

  it("stops after a page shorter than the page size", async () => {
    const discovery = _keysetDiscovery(CATALOG);

    await _collect(discovery);

    expect(vi.mocked(discovery.searchDatasets).mock.calls.length).toBe(3);
  });

  it("sends no further request once the caller closes the crawl", async () => {
    const discovery = _keysetDiscovery(CATALOG);
    const pages = extractHdxDatasets({
      drive: DRIVE,
      window: OPEN_WINDOW,
      discovery,
      pageSize: 2,
    });

    await pages.next();
    await pages.return(undefined);

    expect(vi.mocked(discovery.searchDatasets).mock.calls.length).toBe(1);
  });

  it("stops with an error on a full page with nothing after the cursor", async () => {
    const stuck: CkanDiscoveryClient = {
      searchDatasets: vi.fn(async () => {
        return _page([CATALOG[0]!, CATALOG[1]!]);
      }),
    };

    await expect(_collect(stuck)).rejects.toThrow("nothing after");
  });

  it("passes the window to the first request", async () => {
    const discovery = _keysetDiscovery(CATALOG);
    const since = new Date("2026-10-02T00:00:00.000Z");
    const until = new Date("2026-10-04T00:00:00.000Z");

    await _collect(discovery, { since, until });

    expect(vi.mocked(discovery.searchDatasets).mock.calls[0]?.[0]).toEqual({
      baseUrl: DRIVE.baseUrl,
      modifiedSince: since,
      modifiedBefore: until,
      after: undefined,
      rows: 2,
    });
  });

  it("keeps the window's until on every request after the first", async () => {
    const discovery = _keysetDiscovery(CATALOG);
    const until = new Date("2026-10-05T00:00:00.000Z");

    await _collect(discovery, { since: undefined, until });

    expect(
      vi
        .mocked(discovery.searchDatasets)
        .mock.calls.slice(1)
        .map(([params]) => {
          return [params.modifiedBefore, params.after?.name];
        }),
    ).toEqual([
      [until, "b"],
      [until, "d"],
    ]);
  });

  it("warns when the first page is short, since a server row cap would end the crawl there", async () => {
    const warn = _silenceWarnings();
    const capped: CkanDiscoveryClient = {
      searchDatasets: vi.fn(async () => {
        return _page([CATALOG[0]!]);
      }),
    };

    const pages = await _collect(capped);

    expect(_names(pages)).toEqual(["a"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/https:\/\/data\.humdata\.org.*1 of 2 rows/),
    );
  });

  it("pages on from an invalid dataset that ends a page, and warns about it", async () => {
    const warn = _silenceWarnings();
    const discovery = _keysetDiscovery(CATALOG, ["b"]);

    const pages = await _collect(discovery);

    expect([
      _names(pages),
      vi.mocked(discovery.searchDatasets).mock.calls[1]?.[0].after?.name,
    ]).toEqual([["a", "c", "d", "e"], "b"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /https:\/\/data\.humdata\.org.*\bb\b.*resources\.0\.format: Invalid/,
      ),
    );
  });

  it("pages on past a full page of only invalid datasets", async () => {
    _silenceWarnings();

    const pages = await _collect(_keysetDiscovery(CATALOG, ["a", "b"]));

    expect(_names(pages)).toEqual(["c", "d", "e"]);
  });
});
