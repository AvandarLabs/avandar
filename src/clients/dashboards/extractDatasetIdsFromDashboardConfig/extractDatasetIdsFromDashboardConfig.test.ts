import { describe, expect, it } from "vitest";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig/extractDatasetIdsFromDashboardConfig";

const DATASET_ID = "33333333-3333-4333-8333-333333333333";
const JOINED_DATASET_ID = "55555555-5555-4555-8555-555555555555";
const UUID_LITERAL = "44444444-4444-4444-8444-444444444444";

function _createDashboardConfigFromSql(rawSql: string): unknown {
  return {
    content: [
      {
        type: "DataViz",
        props: { nlQuery: { rawSql, prompt: "" } },
      },
    ],
  };
}

describe("extractDatasetIdsFromDashboardConfig", () => {
  it("extracts UUID table references but ignores UUID value literals", () => {
    const config = _createDashboardConfigFromSql(
      `SELECT * FROM "${DATASET_ID}" WHERE customer_id = '${UUID_LITERAL}'`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([DATASET_ID]);
  });

  it("extracts dangling UUID table references from joins and CTEs", () => {
    const config = _createDashboardConfigFromSql(
      `WITH source AS (SELECT * FROM "${DATASET_ID}")
       SELECT * FROM source
       JOIN "${JOINED_DATASET_ID}" AS joined ON true`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([
      DATASET_ID,
      JOINED_DATASET_ID,
    ]);
  });

  it("accepts DuckDB EXCLUDE and QUALIFY syntax", () => {
    const config = _createDashboardConfigFromSql(
      `SELECT * EXCLUDE (secret)
       FROM "${DATASET_ID}"
       QUALIFY row_number() OVER () = 1`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([DATASET_ID]);
  });

  it("extracts the base dataset from DuckDB PIVOT syntax", () => {
    const config = _createDashboardConfigFromSql(
      `PIVOT "${DATASET_ID}" ON category USING sum(value)`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([DATASET_ID]);
  });

  it("excludes a UUID-shaped CTE alias while retaining its base dataset", () => {
    const config = _createDashboardConfigFromSql(
      `WITH "${UUID_LITERAL}" AS (
         SELECT * FROM "${DATASET_ID}"
       )
       SELECT * FROM "${UUID_LITERAL}"`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([DATASET_ID]);
  });

  it("extracts constant query_table and recursive query dependencies", () => {
    const config = _createDashboardConfigFromSql(
      `SELECT * FROM query('SELECT * FROM "${DATASET_ID}" JOIN query_table(''${JOINED_DATASET_ID}'') ON true')`,
    );

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([
      DATASET_ID,
      JOINED_DATASET_ID,
    ]);
  });

  it("skips a DataViz node whose props carry no nlQuery", () => {
    const config = {
      content: [
        { type: "DataViz", props: { title: "Untitled" } },
        {
          type: "DataViz",
          props: { nlQuery: { rawSql: `SELECT * FROM "${DATASET_ID}"` } },
        },
      ],
    };

    expect(extractDatasetIdsFromDashboardConfig(config)).toEqual([DATASET_ID]);
  });

  it("rejects dynamic and mutating SQL during publication extraction", () => {
    const dynamicConfig = _createDashboardConfigFromSql(
      "SELECT * FROM query_table(dataset_name)",
    );
    const mutatingConfig = _createDashboardConfigFromSql(
      `DROP TABLE "${DATASET_ID}"`,
    );

    expect(() => {
      extractDatasetIdsFromDashboardConfig(dynamicConfig);
    }).toThrow(/dynamic/i);
    expect(() => {
      extractDatasetIdsFromDashboardConfig(mutatingConfig);
    }).toThrow(/mutating/i);
  });
});
