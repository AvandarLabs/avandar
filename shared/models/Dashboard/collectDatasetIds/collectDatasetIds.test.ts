import type { Dashboard } from "$/models/Dashboard/Dashboard.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

import { describe, expect, it } from "vitest";

import { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds.ts";

describe("collectDatasetIds", () => {
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
