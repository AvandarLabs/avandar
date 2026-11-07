import { describe, expect, it } from "vitest";
import { createDataCatalogSearchPage } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";
import type { DataCatalogSearchDBRow } from "@/clients/data-catalog-listings/createDataCatalogSearchPage/createDataCatalogSearchPage";

function _dbRow(
  overrides: Partial<DataCatalogSearchDBRow> = {},
): DataCatalogSearchDBRow {
  return {
    id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
    display_name: "Measles cases",
    external_organization_name: "City of New York",
    pipeline_name: null,
    is_workspace_loadable: true,
    is_invalid: false,
    file_format: "CSV",
    last_updated_at: null,
    total_count: 120,
    ...overrides,
  };
}

describe("createDataCatalogSearchPage", () => {
  it("reads each row's columns in camel case, with nulls as undefined", () => {
    const page = createDataCatalogSearchPage({
      dbRows: [_dbRow()],
      pageNum: 0,
      pageSize: 50,
    });

    expect(page.rows).toEqual([
      {
        id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
        displayName: "Measles cases",
        externalOrganizationName: "City of New York",
        pipelineName: undefined,
        isWorkspaceLoadable: true,
        isInvalid: false,
        fileFormat: "CSV",
        lastUpdatedAt: undefined,
      },
    ]);
  });

  it("takes the total match count from the rows", () => {
    const page = createDataCatalogSearchPage({
      dbRows: [_dbRow({ total_count: 120 })],
      pageNum: 0,
      pageSize: 50,
    });

    expect(page.totalCount).toBe(120);
  });

  it("counts zero matches when the page has no rows", () => {
    const page = createDataCatalogSearchPage({
      dbRows: [],
      pageNum: 0,
      pageSize: 50,
    });

    expect(page.totalCount).toBe(0);
    expect(page.nextPage).toBeUndefined();
  });

  it("names the next page while matches remain past this one", () => {
    const page = createDataCatalogSearchPage({
      dbRows: [_dbRow({ total_count: 120 })],
      pageNum: 1,
      pageSize: 50,
    });

    expect(page.nextPage).toBe(2);
  });

  it("names no next page when this page reaches the last match", () => {
    const page = createDataCatalogSearchPage({
      dbRows: [_dbRow({ total_count: 100 })],
      pageNum: 1,
      pageSize: 50,
    });

    expect(page.nextPage).toBeUndefined();
  });
});
