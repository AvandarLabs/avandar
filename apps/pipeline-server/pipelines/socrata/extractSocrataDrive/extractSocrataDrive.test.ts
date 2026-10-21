import { extractSocrataDrive } from "@pipelines/socrata/extractSocrataDrive/extractSocrataDrive";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EtlRunWindow } from "@avandar/etl";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type {
  ConfiguredDrive,
  SocrataScope,
} from "@pipelines/socrata/configuredDrives/configuredDrives";

const DRIVE: ConfiguredDrive = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};
const OPEN_WINDOW: EtlRunWindow = { since: undefined, until: undefined };

afterEach(() => {
  vi.restoreAllMocks();
});

function _at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 0, minute));
}

function _catalog(size: number): SocrataDiscoveryResult[] {
  return Array.from({ length: size }, (_, index) => {
    return {
      datasetId: `ds-${index}`,
      name: `Dataset ${index}`,
      domain: "data.cityofnewyork.us",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: _at(index).toISOString(),
    };
  });
}

/**
 * A discovery client over `catalog`. A dataset id in `invalidIds` fails
 * validation: it is left out of `results` and listed in `skippedResults`.
 */
function _discoveryOver(
  catalog: readonly SocrataDiscoveryResult[],
  options: { resultSetSize?: number; invalidIds?: readonly string[] } = {},
): SocrataDiscoveryClient {
  const { resultSetSize = catalog.length, invalidIds = [] } = options;
  return {
    search: vi.fn(async ({ limit = 100, offset = 0 }) => {
      const page = catalog.slice(offset, offset + limit);
      return {
        results: page.filter((result) => {
          return !invalidIds.includes(result.datasetId);
        }),
        skippedResults: page
          .filter((result) => {
            return invalidIds.includes(result.datasetId);
          })
          .map((result) => {
            return { datasetId: result.datasetId, reason: "updatedAt: Invalid" };
          }),
        resultSetSize,
      };
    }),
  };
}

/**
 * A discovery client whose catalog changes once, between the first and the
 * second search, the way a portal does when datasets are edited mid-crawl.
 */
function _discoveryChangingAfterFirstPage(
  catalog: readonly SocrataDiscoveryResult[],
  options: {
    changeCatalog: (
      catalog: readonly SocrataDiscoveryResult[],
    ) => SocrataDiscoveryResult[];
    invalidIds?: readonly string[];
  },
): SocrataDiscoveryClient {
  const before = _discoveryOver(catalog, options);
  const after = _discoveryOver(options.changeCatalog(catalog), options);
  let callCount = 0;
  return {
    search: vi.fn(async (params) => {
      callCount += 1;
      return callCount === 1 ? before.search(params) : after.search(params);
    }),
  };
}

/** Moves the first `count` datasets to the end, as if just modified. */
function _modifyFirst(count: number) {
  return (catalog: readonly SocrataDiscoveryResult[]) => {
    const modified = catalog.slice(0, count).map((result, index) => {
      const updatedAt = _at(catalog.length + index).toISOString();
      return { ...result, updatedAt };
    });
    return [...catalog.slice(count), ...modified];
  };
}

async function _collect(
  window: EtlRunWindow,
  discovery: SocrataDiscoveryClient,
  scope: SocrataScope = { key: "all" },
) {
  const pages: SocrataDiscoveryResult[][] = [];
  // Sequential on purpose: the generator pages one request at a time.
  for await (const page of extractSocrataDrive({
    drive: DRIVE,
    scope,
    window,
    discovery,
  })) {
    pages.push([...page]);
  }
  return pages;
}

function _offsets(discovery: SocrataDiscoveryClient): unknown[] {
  return vi.mocked(discovery.search).mock.calls.map(([params]) => {
    return params.offset;
  });
}

describe("extractSocrataDrive", () => {
  it("asks for one drive, updatedAt ASC, in pages of 1000", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery);

    expect(vi.mocked(discovery.search)).toHaveBeenCalledWith({
      domains: ["data.cityofnewyork.us"],
      order: "updatedAt ASC",
      limit: 1000,
      offset: 0,
    });
  });

  it("narrows a category scope at the source, in the drive's own search context", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery, {
      key: "category:education",
      categories: ["Education"],
    });

    expect(vi.mocked(discovery.search)).toHaveBeenCalledWith({
      domains: ["data.cityofnewyork.us"],
      searchContext: "data.cityofnewyork.us",
      categories: ["Education"],
      order: "updatedAt ASC",
      limit: 1000,
      offset: 0,
    });
  });

  it("sends a tag scope's tags", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery, { key: "tag:doe", tags: ["doe"] });

    expect(vi.mocked(discovery.search).mock.calls[0]?.[0].tags).toEqual([
      "doe",
    ]);
  });

  it("treats an empty categories list as no filter and sends no searchContext", async () => {
    const discovery = _discoveryOver(_catalog(10));

    await _collect(OPEN_WINDOW, discovery, {
      key: "category:none",
      categories: [],
    });

    expect(vi.mocked(discovery.search)).toHaveBeenCalledWith({
      domains: ["data.cityofnewyork.us"],
      order: "updatedAt ASC",
      limit: 1000,
      offset: 0,
    });
  });

  it("starts each page 20 results before the previous page ended", async () => {
    const discovery = _discoveryOver(_catalog(1500));

    await _collect(OPEN_WINDOW, discovery);

    expect(_offsets(discovery)).toEqual([0, 980]);
  });

  it("skips results before since", async () => {
    const pages = await _collect(
      { since: _at(3), until: undefined },
      _discoveryOver(_catalog(5)),
    );

    expect(
      pages.flat().map((result) => {
        return result.datasetId;
      }),
    ).toEqual(["ds-3", "ds-4"]);
  });

  it("stops at the first result at or after until and asks for no further page", async () => {
    const discovery = _discoveryOver(_catalog(1500));

    const pages = await _collect(
      { since: undefined, until: _at(500) },
      discovery,
    );

    expect([pages.flat().length, _offsets(discovery)]).toEqual([500, [0]]);
  });

  it("fails a drive over 10,000 results before yielding a page", async () => {
    const discovery = _discoveryOver(_catalog(5), { resultSetSize: 10_001 });

    await expect(_collect(OPEN_WINDOW, discovery)).rejects.toThrow(
      "https://data.cityofnewyork.us has 10001 results",
    );
  });

  it("pages past a skipped result by its raw position, and warns about it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });
    const discovery = _discoveryOver(_catalog(1500), { invalidIds: ["ds-5"] });

    const pages = await _collect(OPEN_WINDOW, discovery);

    expect([pages[0]?.length, _offsets(discovery)]).toEqual([999, [0, 980]]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /https:\/\/data\.cityofnewyork\.us.*ds-5.*updatedAt: Invalid/,
      ),
    );
  });

  it("fails when more datasets move than the page overlap covers", async () => {
    const discovery = _discoveryChangingAfterFirstPage(_catalog(1500), {
      changeCatalog: _modifyFirst(21),
    });

    await expect(_collect(OPEN_WINDOW, discovery)).rejects.toThrow(
      "Socrata drive https://data.cityofnewyork.us lost its page overlap at offset 980",
    );
  });

  it("fails when an overlap dataset reappears only with a newer updatedAt", async () => {
    const moveFirst21 = _modifyFirst(21);
    const discovery = _discoveryChangingAfterFirstPage(_catalog(1500), {
      changeCatalog: (catalog) => {
        const moved = moveFirst21(catalog);
        const overlapDataset = moved.find((result) => {
          return result.datasetId === "ds-990";
        });
        const updatedAt = _at(2000).toISOString();
        return [
          ...moved.filter((result) => {
            return result.datasetId !== "ds-990";
          }),
          ...(overlapDataset ? [{ ...overlapDataset, updatedAt }] : []),
        ];
      },
    });

    await expect(_collect(OPEN_WINDOW, discovery)).rejects.toThrow(
      "lost its page overlap at offset 980",
    );
  });

  it("continues when fewer datasets move than the page overlap covers", async () => {
    const discovery = _discoveryChangingAfterFirstPage(_catalog(1500), {
      changeCatalog: _modifyFirst(19),
    });

    const pages = await _collect(OPEN_WINDOW, discovery);

    expect(pages.flat().length).toBe(1520);
  });

  it("continues when the overlap is reshuffled but still present", async () => {
    const discovery = _discoveryChangingAfterFirstPage(_catalog(1500), {
      changeCatalog: (catalog) => {
        return [
          ...catalog.slice(0, 980),
          ...catalog.slice(980, 990).reverse(),
          ...catalog.slice(990),
        ];
      },
    });

    await expect(_collect(OPEN_WINDOW, discovery)).resolves.toHaveLength(2);
  });

  it("counts a skipped result's id as part of the overlap", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });
    const invalidIds = Array.from({ length: 10 }, (_, index) => {
      return `ds-${990 + index}`;
    });
    const discovery = _discoveryChangingAfterFirstPage(_catalog(1500), {
      changeCatalog: _modifyFirst(10),
      invalidIds,
    });

    await expect(_collect(OPEN_WINDOW, discovery)).resolves.toHaveLength(2);
  });
});
