import { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

describe("collectDatasetIds", () => {
  it("exposes the dashboard visibility type from the namespace entry", () => {
    expectTypeOf<Dashboard.Visibility>().toEqualTypeOf<
      "draft" | "workspace" | "public"
    >();
  });

  it("returns dataset ids referenced in dashboard config", () => {
    const datasetA = "00000000-0000-4000-8000-000000000001" as Dataset.Id;
    const datasetB = "00000000-0000-4000-8000-000000000002" as Dataset.Id;
    const dashboard = {
      config: {
        content: [
          {
            props: {
              nlQuery: {
                rawSql: `SELECT * FROM "${datasetA}"`,
              },
            },
          },
        ],
      },
    } as unknown as Dashboard.T;

    const ids = collectDatasetIds(dashboard, [datasetA, datasetB]);
    expect(ids).toEqual([datasetA]);
  });

  it("returns full when no datasets are referenced", () => {
    const dashboard = { config: { content: [] } } as unknown as Dashboard.T;
    expect(collectDatasetIds(dashboard, [])).toEqual([]);
  });
});
