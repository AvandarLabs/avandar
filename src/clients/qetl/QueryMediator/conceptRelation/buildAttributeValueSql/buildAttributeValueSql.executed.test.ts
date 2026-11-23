/**
 * Executed tests for the SQL that turns one dataset-column mapping into one
 * value per record.
 *
 * Every case runs the emitted subquery against a real DuckDB over a real
 * parquet file. The fixture holds NULLs and ties on purpose: a rule that is
 * right only without them is not right. The key column and one value column
 * have a double quote in their names, so every case also proves that the
 * identifiers are quoted.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildAttributeValueSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { AttributeValueSqlOptions } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import type { DuckDBConnection } from "@duckdb/node-api";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const SPINE = "records";

/** Every option a case does not override: `first` over `region`. */
const BASE_OPTIONS: AttributeValueSqlOptions = {
  selectColumnName: "region",
  primaryKeyColumnName: 'case "id"',
  datasetId: DATASET_ID,
  columnDataType: "varchar",
  valuePickerRuleType: "first",
  valueShape: "single",
  outputColumnName: "value",
  externalIdsTable: SPINE,
  externalIdColumn: "external_id",
};

/**
 * One dataset and a spine of five records. In file order:
 *
 * - `p1`: a NULL region first, then North and South, so `first` must read
 *   past the NULL, and North and South tie under `most_frequent`.
 * - `p2`: two NULL regions and one East, so NULL is the most common cell.
 * - `p3`: only NULLs.
 * - `p4`: West then East, a tie that breaks by value.
 * - `p5`: no rows at all.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const path = join(tmpdir(), "ava-attribute-value.parquet");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', CAST(NULL AS VARCHAR), CAST(NULL AS INTEGER), CAST(NULL AS VARCHAR)),
        ('p1', 'North', 2, 'Al'),
        ('p1', 'South', 4, NULL),
        ('p2', NULL, NULL, NULL),
        ('p2', NULL, NULL, NULL),
        ('p2', 'East', 1, NULL),
        ('p3', NULL, NULL, NULL),
        ('p4', 'West', 3, NULL),
        ('p4', 'East', 5, NULL)
      ) AS t("case ""id""", region, dose, "nick ""name""")
    ) TO '${path}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${DATASET_ID}" AS SELECT * FROM read_parquet('${path}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_ID)}" AS
      SELECT * FROM read_parquet('${path}', file_row_number = true);
    CREATE TABLE ${SPINE} AS
      SELECT * FROM (VALUES ('p1'), ('p2'), ('p3'), ('p4'), ('p5'))
        AS t(external_id);
  `);
}

/** DuckDB returns big integers as bigint and lists as array-likes. */
function _normalize(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value !== null && typeof value === "object" && "items" in value) {
    return (value as { items: unknown[] }).items;
  }
  return value;
}

/**
 * Emits one subquery per named column, runs them over the spine, and returns
 * each record's values keyed by column name.
 */
async function _readRecords(
  columns: Readonly<
    Record<string, Readonly<Partial<AttributeValueSqlOptions>>>
  >,
): Promise<Record<string, Record<string, unknown>>> {
  const selectors = Object.entries(columns).map(
    ([outputColumnName, overrides]) => {
      return buildAttributeValueSql({
        ...BASE_OPTIONS,
        ...overrides,
        outputColumnName,
      });
    },
  );
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    const reader = await connection.runAndReadAll(
      `SELECT external_id, ${selectors.join(", ")} FROM ${SPINE} ORDER BY external_id`,
    );
    return Object.fromEntries(
      reader.getRowObjects().map((row) => {
        const { external_id: externalId, ...values } = row;
        return [
          String(externalId),
          Object.fromEntries(
            Object.entries(values).map(([name, value]) => {
              return [name, _normalize(value)];
            }),
          ),
        ];
      }),
    );
  });
}

/** One column of `_readRecords`' result, keyed by record. */
function _getColumn(
  records: Readonly<Record<string, Record<string, unknown>>>,
  columnName: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(records).map(([externalId, values]) => {
      return [externalId, values[columnName]];
    }),
  );
}

describe("buildAttributeValueSql", () => {
  it("returns the first non-NULL value in file order under first", async () => {
    const records = await _readRecords({ region: {} });

    expect(_getColumn(records, "region")).toEqual({
      p1: "North",
      p2: "East",
      p3: null,
      p4: "West",
      p5: null,
    });
  });

  it("ignores NULL under most_frequent even when NULL is the most common cell", async () => {
    const records = await _readRecords({
      region: { valuePickerRuleType: "most_frequent" },
    });

    expect(records.p2?.region).toBe("East");
  });

  it("breaks a most_frequent tie by value", async () => {
    const records = await _readRecords({
      region: { valuePickerRuleType: "most_frequent" },
    });

    expect([records.p1?.region, records.p4?.region]).toEqual(["North", "East"]);
  });

  it("keeps every non-NULL value in file order as a list, and an empty list when there is none", async () => {
    const records = await _readRecords({ regions: { valueShape: "list" } });

    expect(_getColumn(records, "regions")).toEqual({
      p1: ["North", "South"],
      p2: ["East"],
      p3: [],
      p4: ["West", "East"],
      p5: [],
    });
  });

  // One value needs a rule to pick it. A guessed rule would answer with a
  // value nobody chose, so the SQL is refused rather than built.
  it("refuses to read one value without a value rule", () => {
    expect(() => {
      return buildAttributeValueSql({
        ...BASE_OPTIONS,
        valuePickerRuleType: undefined,
      });
    }).toThrow(/names no value rule/);
  });

  // A list keeps every value whatever rule it is handed.
  it("keeps every value of a list even when it is handed a rule", async () => {
    const records = await _readRecords({
      regions: { valueShape: "list", valuePickerRuleType: "max" },
    });

    expect(_getColumn(records, "regions").p1).toEqual(["North", "South"]);
  });

  it("ignores NULL in sum, avg, count, max, and min", async () => {
    const records = await _readRecords({
      sum: {
        selectColumnName: "dose",
        columnDataType: "bigint",
        valuePickerRuleType: "sum",
      },
      avg: {
        selectColumnName: "dose",
        columnDataType: "bigint",
        valuePickerRuleType: "avg",
      },
      count: {
        selectColumnName: "dose",
        columnDataType: "bigint",
        valuePickerRuleType: "count",
      },
      max: {
        selectColumnName: "dose",
        columnDataType: "bigint",
        valuePickerRuleType: "max",
      },
      min: {
        selectColumnName: "dose",
        columnDataType: "bigint",
        valuePickerRuleType: "min",
      },
    });

    expect(records.p1).toEqual({ sum: 6, avg: 3, count: 2, max: 4, min: 2 });
  });

  it("reads a value column whose name contains a double quote", async () => {
    const records = await _readRecords({
      nickname: { selectColumnName: 'nick "name"' },
    });

    expect(records.p1?.nickname).toBe("Al");
  });
});
