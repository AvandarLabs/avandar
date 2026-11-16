import { describe, expect, it } from "vitest";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { DuckDBConnection } from "@duckdb/node-api";

const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;
const CONCEPT_ID = "7a1c0e52-3f1d-4c55-9a43-1d2b5e6f7a80" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "col_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
};

/**
 * A three-case line list stored under the dataset's bare id, plus a case
 * type view over it named the way the query engine names one.
 */
async function _createRelations(connection: DuckDBConnection): Promise<void> {
  await connection.run(`
    CREATE TABLE "${DATASET_ID}" AS
    SELECT * FROM (VALUES
      (DATE '2026-01-05', 'Maputo', 'ignored'),
      (DATE '2026-01-06', 'Beira', 'ignored'),
      (DATE '2026-01-06', NULL, 'ignored')
    ) AS cases("Onset date", "District", "Notes")
  `);
  await connection.run(`
    CREATE VIEW "concept_${CONCEPT_ID}" AS
    SELECT "Onset date", "District" FROM "${DATASET_ID}"
  `);
}

async function _runRows(
  sql: string,
): Promise<{ columnNames: string[]; rows: Array<Record<string, unknown>> }> {
  return await withDuckDb(async (connection) => {
    await _createRelations(connection);
    const reader = await connection.runAndReadAll(sql);
    return {
      columnNames: reader.columnNames(),
      rows: reader.getRowObjectsJson() as Array<Record<string, unknown>>,
    };
  });
}

describe("makeDataSlotSqlFromBinding in DuckDB", () => {
  it("reads a dataset's mapped columns under the slot's attribute keys", async () => {
    const { columnNames, rows } = await _runRows(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: {
          kind: "dataset",
          datasetId: DATASET_ID,
          name: "line_list.csv",
          fields: [ONSET_FIELD, DISTRICT_FIELD],
        },
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    );

    expect(columnNames).toEqual(["onsetDate", "district"]);
    expect(rows).toEqual([
      { onsetDate: "2026-01-05", district: "Maputo" },
      { onsetDate: "2026-01-06", district: "Beira" },
      { onsetDate: "2026-01-06", district: null },
    ]);
  });

  it("reads a case type through its concept view", async () => {
    const source: DataSlotSource = {
      kind: "concept",
      conceptId: CONCEPT_ID,
      name: "Measles cases",
      fields: [ONSET_FIELD, DISTRICT_FIELD],
    };

    const { rows } = await _runRows(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
        limit: 2,
      }),
    );

    expect(rows).toHaveLength(2);
  });

  it("returns one source column under both attribute keys when two attributes share it", async () => {
    const { columnNames, rows } = await _runRows(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: {
          kind: "dataset",
          datasetId: DATASET_ID,
          name: "line_list.csv",
          fields: [ONSET_FIELD, DISTRICT_FIELD],
        },
        fieldsByAttributeKey: {
          onsetDate: DISTRICT_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    );

    expect(columnNames).toEqual(["onsetDate", "district"]);
    expect(rows[0]).toEqual({ onsetDate: "Maputo", district: "Maputo" });
  });

  it("returns a NULL text column for an unmapped optional attribute", async () => {
    const sql = makeDataSlotSqlFromBinding({
      slot: CASES_SLOT,
      source: {
        kind: "dataset",
        datasetId: DATASET_ID,
        name: "line_list.csv",
        fields: [ONSET_FIELD],
      },
      fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
    });

    const columnTypes = await withDuckDb(async (connection) => {
      await _createRelations(connection);
      const reader = await connection.runAndReadAll(
        `SELECT any_value(typeof("district")) AS district_type, count("district") AS filled FROM (${sql})`,
      );
      return reader.getRowObjectsJson();
    });

    expect(columnTypes).toEqual([{ district_type: "VARCHAR", filled: "0" }]);
  });
});
