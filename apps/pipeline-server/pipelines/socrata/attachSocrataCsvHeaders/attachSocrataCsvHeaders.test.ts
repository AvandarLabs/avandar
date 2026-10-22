import { attachSocrataCsvHeaders } from "@pipelines/socrata/attachSocrataCsvHeaders/attachSocrataCsvHeaders";
import { describe, expect, it, vi } from "vitest";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};

function _result(
  datasetId: string,
  fieldNames: readonly string[],
): SocrataDiscoveryResult {
  return {
    datasetId,
    name: datasetId,
    domain: "data.cityofnewyork.us",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    columns: fieldNames.map((fieldName) => {
      return { fieldName, name: fieldName, dataType: "Text" };
    }),
  };
}

async function* _pages(
  ...pages: SocrataDiscoveryResult[][]
): AsyncGenerator<readonly SocrataDiscoveryResult[]> {
  yield* pages;
}

describe("attachSocrataCsvHeaders", () => {
  it("adds each dataset's CSV header, page by page, in order", async () => {
    const readCsvHeader = vi.fn(
      async ({ datasetId }: { datasetId: string }) => {
        return [`${datasetId}_column`];
      },
    );

    const pages = [];
    for await (const page of attachSocrataCsvHeaders({
      pages: _pages(
        [_result("a", ["x"]), _result("b", ["x"])],
        [_result("c", ["x"])],
      ),
      drive: DRIVE,
      readCsvHeader,
    })) {
      pages.push(
        page.map((dataset) => {
          return [dataset.datasetId, dataset.csvHeader];
        }),
      );
    }

    expect(pages).toEqual([
      [
        ["a", ["a_column"]],
        ["b", ["b_column"]],
      ],
      [["c", ["c_column"]]],
    ]);
  });

  it("does not ask for the header of a dataset with only system columns", async () => {
    const readCsvHeader = vi.fn(async () => {
      return ["x"];
    });

    const pages = [];
    for await (const page of attachSocrataCsvHeaders({
      pages: _pages([
        _result("file", []),
        _result("regions", [":@computed_region_a"]),
      ]),
      drive: DRIVE,
      readCsvHeader,
    })) {
      pages.push(page);
    }

    expect(
      pages[0]?.map((dataset) => {
        return dataset.csvHeader;
      }),
    ).toEqual([undefined, undefined]);
    expect(readCsvHeader).not.toHaveBeenCalled();
  });

  it("asks for at most 8 headers at a time", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const readCsvHeader = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
      inFlight -= 1;
      return ["x"];
    };
    const page = Array.from({ length: 20 }, (_, index) => {
      return _result(`ds-${index}`, ["x"]);
    });

    for await (const _page of attachSocrataCsvHeaders({
      pages: _pages(page),
      drive: DRIVE,
      readCsvHeader,
    })) {
      // Drains the pages.
    }

    expect(maxInFlight).toBe(8);
  });
});
