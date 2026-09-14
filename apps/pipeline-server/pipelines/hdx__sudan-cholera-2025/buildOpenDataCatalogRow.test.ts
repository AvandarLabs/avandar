import {
  buildOpenDataCatalogRow, // oxfmt-ignore
} from "@pipelines/hdx__sudan-cholera-2025/buildOpenDataCatalogRow";
import {
  SUDAN_CHOLERA_CATALOG_ENTRIES, // oxfmt-ignore
} from "@pipelines/hdx__sudan-cholera-2025/sudanCholeraCatalogEntries";
import { describe, expect, it } from "vitest";

describe("buildOpenDataCatalogRow", () => {
  const rows = SUDAN_CHOLERA_CATALOG_ENTRIES.map(buildOpenDataCatalogRow);

  it("builds one row per registered resource", () => {
    expect(rows).toHaveLength(SUDAN_CHOLERA_CATALOG_ENTRIES.length);
  });

  it("marks every row as an API resource served over CKAN", () => {
    for (const row of rows) {
      expect(row.access_kind).toBe("api_resource");
      expect(row.api_service).toBe("ckan");
    }
  });

  it("keeps every API base URL on TLS, which the table requires", () => {
    for (const row of rows) {
      expect(row.api_base_url).toMatch(/^https:\/\//);
    }
  });

  it("carries no pipeline column, which an API row must not have", () => {
    for (const row of rows) {
      expect(row).not.toHaveProperty("parquet_file_name");
      expect(row).not.toHaveProperty("pipeline_name");
      expect(row).not.toHaveProperty("pipeline_run_id");
    }
  });

  it("names the dataset and resource the acquisition has to ask CKAN for", () => {
    for (const row of rows) {
      expect(row.external_dataset_id).not.toBe("");
      expect(row.api_resource_id).not.toBe("");
      expect(row.api_resource_format).not.toBe("");
    }
  });

  it("repeats the column names in metadata for the import form's fallback", () => {
    const [rainfall] = rows;
    expect(rainfall!.metadata.table.column_names).toContain("rfh");
    expect(rainfall!.metadata.table.column_names).toContain("PCODE");
  });

  it("gives each resource a distinct catalog identity", () => {
    const identities = rows.map((row) => {
      return `${row.api_base_url}|${row.external_dataset_id}|${row.api_resource_id}`;
    });
    expect(new Set(identities).size).toBe(rows.length);
  });
});
