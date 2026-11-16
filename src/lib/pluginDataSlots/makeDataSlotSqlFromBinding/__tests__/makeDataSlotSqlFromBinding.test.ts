import { describe, expect, it } from "vitest";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";

const CONCEPT_ID = "7a1c0e52-3f1d-4c55-9a43-1d2b5e6f7a80" as Concept.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;

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
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "attr_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
};

const CONCEPT_SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

const DATASET_SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

describe("makeDataSlotSqlFromBinding", () => {
  it("selects each mapped field under its attribute key from the case type's view", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: CONCEPT_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    ).toBe(
      `SELECT "Onset date" AS "onsetDate", "District" AS "district"\n` +
        `FROM "concept_${CONCEPT_ID}"`,
    );
  });

  it("reads a dataset from the relation named by its bare id", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    ).toBe(
      `SELECT "Onset date" AS "onsetDate", "District" AS "district"\n` +
        `FROM "${DATASET_ID}"`,
    );
  });

  it("ends with a LIMIT when one is given", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
        limit: 200_001,
      }),
    ).toMatch(/\nLIMIT 200001$/);
  });

  it("quotes a column name that holds a double quote", () => {
    const quotedField: DataSlotSourceField = {
      ...ONSET_FIELD,
      columnName: `Onset "first" date`,
    };

    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: { onsetDate: quotedField, district: undefined },
      }),
    ).toContain(`"Onset ""first"" date" AS "onsetDate"`);
  });

  it("selects one source column for two attributes under two attribute keys", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: ONSET_FIELD,
        },
      }),
    ).toBe(
      `SELECT "Onset date" AS "onsetDate", "Onset date" AS "district"\n` +
        `FROM "${DATASET_ID}"`,
    );
  });

  it("names columns by position when asked, whatever the attribute keys", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: undefined,
        },
        aliasStyle: "position",
      }),
    ).toBe(
      `SELECT "Onset date" AS "attr_0", CAST(NULL AS VARCHAR) AS "attr_1"\n` +
        `FROM "${DATASET_ID}"`,
    );
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "throws for the limit %s",
    (limit) => {
      expect(() => {
        makeDataSlotSqlFromBinding({
          slot: CASES_SLOT,
          source: DATASET_SOURCE,
          fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
          limit,
        });
      }).toThrow("non-negative integer");
    },
  );

  it("accepts a limit of 0", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
        limit: 0,
      }),
    ).toMatch(/\nLIMIT 0$/);
  });

  it.each<[DataSlotAttributeType, string]>([
    ["number", "DOUBLE"],
    ["date", "DATE"],
    ["text", "VARCHAR"],
    ["boolean", "BOOLEAN"],
    ["geo.admin1", "VARCHAR"],
    ["geo.admin2", "VARCHAR"],
  ])(
    "selects an unmapped optional %s attribute as a NULL of type %s",
    (type, sqlType) => {
      const slot: PluginDataSlot = {
        ...CASES_SLOT,
        attributes: {
          extra: { type, title: "%slot.cases.extra%", required: false },
        },
      };

      expect(
        makeDataSlotSqlFromBinding({
          slot,
          source: DATASET_SOURCE,
          fieldsByAttributeKey: { extra: undefined },
        }),
      ).toBe(
        `SELECT CAST(NULL AS ${sqlType}) AS "extra"\nFROM "${DATASET_ID}"`,
      );
    },
  );
});
