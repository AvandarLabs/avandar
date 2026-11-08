/**
 * proposeCaseType tool args become an editable draft for the client card, so
 * the parser must default the tweakable fields rather than reject a partial
 * proposal, and must drop attributes whose ids the model invented.
 *
 * A case type assembled from several datasets is the normal case, so the
 * multi-dataset shape and its join keys are covered first.
 */
import { parseProposeCaseType } from "@sbfn/chat/PostChatMessages/parsing/parseProposeCaseType.ts";
import { describe, expect, it } from "vitest";

const DEATHS_DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATASET_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const DEATHS_KEY_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_KEY_COLUMN_ID = "1a2b3c4d-bbbb-4bbb-8ccc-ddddeeeeffff";
const STATE_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";
const POPULATION_COLUMN_ID = "2b3c4d5e-bbbb-4bbb-8ccc-ddddeeeeffff";
const SYMPTOMS_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";

/** Parses a draft against a catalog that lists no columns. */
function _parse(
  argsJson: string | undefined,
): ReturnType<typeof parseProposeCaseType> {
  return parseProposeCaseType(argsJson, { columns: [] });
}

/** A one-dataset proposal: the join key is the deaths key, the label State. */
function _buildProposalJson(attributes: readonly unknown[]): string {
  return JSON.stringify({
    name: "Measles case",
    sourceDatasets: [
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
    ],
    labelColumnId: STATE_COLUMN_ID,
    attributes,
    manualEntryAttributes: [],
  });
}

function _createAttributeRecord(
  options: Readonly<{ columnId: string; name: string; valueShape?: unknown }>,
): Record<string, unknown> {
  const { columnId, name, valueShape } = options;
  return {
    datasetId: DEATHS_DATASET_ID,
    columnId,
    name,
    isIncluded: true,
    valuePickerRuleType: "first",
    ...(valueShape === undefined ? {} : { valueShape }),
  };
}

describe("parseProposeCaseType", () => {
  it("parses a draft that joins columns from two datasets", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "County COVID record",
        description: "One county's deaths and population",
        allowManualCreation: false,
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
          {
            datasetId: CENSUS_DATASET_ID,
            primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
        labelColumnId: STATE_COLUMN_ID,
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "State",
            isIncluded: true,
            valuePickerRuleType: "most_frequent",
          },
          {
            datasetId: CENSUS_DATASET_ID,
            columnId: POPULATION_COLUMN_ID,
            name: "Population",
            isIncluded: true,
            valuePickerRuleType: "max",
          },
        ],
        manualEntryAttributes: [],
      }),
    );

    expect(parsed?.sourceDatasets).toEqual([
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
      },
    ]);
    expect(
      parsed?.attributes.map((attribute) => {
        return [attribute.datasetId, attribute.name];
      }),
    ).toEqual([
      [DEATHS_DATASET_ID, "State"],
      [CENSUS_DATASET_ID, "Population"],
    ]);
  });

  it("drops an attribute naming a dataset that is not a source", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "County COVID record",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "State",
          },
          {
            datasetId: CENSUS_DATASET_ID,
            columnId: POPULATION_COLUMN_ID,
            name: "Population",
          },
        ],
      }),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["State"]);
  });

  it("drops a source dataset the model listed twice", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "County COVID record",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: STATE_COLUMN_ID,
          },
        ],
        attributes: [],
      }),
    );

    expect(parsed?.sourceDatasets).toEqual([
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
    ]);
  });

  it("reads a proposed list field as keeping every value", () => {
    const parsed = _parse(
      _buildProposalJson([
        _createAttributeRecord({ columnId: STATE_COLUMN_ID, name: "State" }),
        _createAttributeRecord({
          columnId: SYMPTOMS_COLUMN_ID,
          name: "Symptoms",
          valueShape: "list",
        }),
      ]),
    );

    expect(parsed?.attributes[1]?.valueShape).toBe("list");
  });

  it("keeps a list field's value rule so the card can switch it back", () => {
    const parsed = _parse(
      _buildProposalJson([
        _createAttributeRecord({
          columnId: SYMPTOMS_COLUMN_ID,
          name: "Symptoms",
          valueShape: "list",
        }),
      ]),
    );

    expect(parsed?.attributes[0]).toMatchObject({
      valueShape: "list",
      valuePickerRuleType: "first",
    });
  });

  it("reads a field with no value shape, or an unknown one, as keeping one value", () => {
    const parsed = _parse(
      _buildProposalJson([
        _createAttributeRecord({ columnId: STATE_COLUMN_ID, name: "State" }),
        _createAttributeRecord({
          columnId: SYMPTOMS_COLUMN_ID,
          name: "Symptoms",
          valueShape: "many",
        }),
      ]),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.valueShape;
      }),
    ).toEqual(["single", "single"]);
  });

  it("keeps the label column and every join key to one value even when proposed as lists", () => {
    const parsed = _parse(
      _buildProposalJson([
        _createAttributeRecord({
          columnId: DEATHS_KEY_COLUMN_ID,
          name: "County code",
          valueShape: "list",
        }),
        _createAttributeRecord({
          columnId: STATE_COLUMN_ID,
          name: "State",
          valueShape: "list",
        }),
        _createAttributeRecord({
          columnId: SYMPTOMS_COLUMN_ID,
          name: "Symptoms",
          valueShape: "list",
        }),
      ]),
    );

    expect(
      parsed?.attributes.map((attribute) => {
        return attribute.valueShape;
      }),
    ).toEqual(["single", "single", "list"]);
  });

  it("includes attributes by default as one value and falls back to most_frequent", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "Doctor",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "Specialty",
          },
        ],
      }),
    );

    expect(parsed?.attributes).toEqual([
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: STATE_COLUMN_ID,
        name: "Specialty",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "most_frequent",
      },
    ]);
    expect(parsed?.allowManualCreation).toBe(false);
    expect(parsed?.manualEntryAttributes).toEqual([]);
  });

  it("rejects an unknown value picker rule instead of passing it on", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "Doctor",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "Specialty",
            valuePickerRuleType: "median",
          },
        ],
      }),
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("most_frequent");
  });

  it("drops attributes whose column id is not a uuid", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "Doctor",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: "specialty",
            name: "Specialty",
          },
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "Region",
          },
        ],
      }),
    );

    const names = parsed?.attributes.map((attribute) => {
      return attribute.name;
    });
    expect(names).toEqual(["Region"]);
  });

  it("drops a label column that is not one of the attributes", () => {
    const parsed = _parse(
      JSON.stringify({
        name: "Doctor",
        sourceDatasets: [
          {
            datasetId: DEATHS_DATASET_ID,
            primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
          },
        ],
        labelColumnId: POPULATION_COLUMN_ID,
        attributes: [
          {
            datasetId: DEATHS_DATASET_ID,
            columnId: STATE_COLUMN_ID,
            name: "Region",
          },
        ],
      }),
    );

    expect(parsed?.labelColumnId).toBeUndefined();
  });

  it("returns undefined without a name or any usable source dataset", () => {
    expect(
      _parse(
        JSON.stringify({
          sourceDatasets: [
            {
              datasetId: DEATHS_DATASET_ID,
              primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
            },
          ],
        }),
      ),
    ).toBeUndefined();
    expect(_parse(JSON.stringify({ name: "Doctor" }))).toBeUndefined();
    expect(
      _parse(
        JSON.stringify({
          name: "Doctor",
          sourceDatasets: [{ datasetId: DEATHS_DATASET_ID }],
        }),
      ),
    ).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    expect(_parse("{not json")).toBeUndefined();
    expect(_parse(undefined)).toBeUndefined();
  });
});

/** A minimal valid proposal, plus whatever fields a case adds. */
function _parseWithFields(
  fields: Record<string, unknown>,
): ReturnType<typeof parseProposeCaseType> {
  return _parse(
    JSON.stringify({
      name: "Cholera case",
      sourceDatasets: [
        {
          datasetId: DEATHS_DATASET_ID,
          primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
        },
      ],
      attributes: [],
      manualEntryAttributes: [],
      ...fields,
    }),
  );
}

const WORKFLOW = [
  {
    name: "Suspected",
    description: "Reported but not yet tested.",
    color: "#fab005",
  },
  {
    name: "Confirmed",
    description: "A lab test came back positive.",
    color: "#fa5252",
  },
  {
    name: "Ruled out",
    description: "A lab test came back negative.",
    color: "#637c95",
  },
];

describe("parseProposeCaseType statuses", () => {
  it("keeps proposed statuses in order with the named default", () => {
    const parsed = _parseWithFields({
      statuses: WORKFLOW,
      defaultStatusName: "suspected",
    });

    expect(parsed?.statuses).toEqual(WORKFLOW);
    expect(parsed?.defaultStatusName).toBe("Suspected");
  });

  it("makes the first status the default when none is named", () => {
    const parsed = _parseWithFields({ statuses: WORKFLOW });

    expect(parsed?.defaultStatusName).toBe("Suspected");
  });

  it("fills missing colors with the palette colors the set does not use", () => {
    const parsed = _parseWithFields({
      statuses: [
        { name: "Suspected", description: "", color: "#fab005" },
        { name: "Confirmed", description: "" },
        { name: "Ruled out", description: "" },
      ],
    });

    expect(
      parsed?.statuses?.map((status) => {
        return status.color;
      }),
    ).toEqual(["#fab005", "#637c95", "#40c057"]);
  });

  it("replaces a color outside the palette with a free palette color", () => {
    const parsed = _parseWithFields({
      statuses: [{ name: "Open", description: "", color: "#123456" }],
    });

    expect(parsed?.statuses?.[0]?.color).toBe("#637c95");
  });

  it("drops the status set when two statuses share a name in any case", () => {
    const parsed = _parseWithFields({
      statuses: [
        { name: "Confirmed", description: "" },
        { name: " confirmed ", description: "" },
      ],
    });

    expect(parsed?.statuses).toBeUndefined();
    expect(parsed?.defaultStatusName).toBeUndefined();
  });

  it("drops the status set when it has more than 12 statuses", () => {
    const parsed = _parseWithFields({
      statuses: Array.from({ length: 13 }, (_, index) => {
        return { name: `Stage ${index}`, description: "" };
      }),
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("drops the status set when the default is not one of the statuses", () => {
    const parsed = _parseWithFields({
      statuses: WORKFLOW,
      defaultStatusName: "Closed",
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("drops the status set when a status has no name", () => {
    const parsed = _parseWithFields({
      statuses: [...WORKFLOW, { name: "  ", description: "" }],
    });

    expect(parsed?.statuses).toBeUndefined();
  });

  it("leaves statuses out when the proposal has none", () => {
    const parsed = _parseWithFields({});

    expect(parsed).toBeDefined();
    expect(parsed?.statuses).toBeUndefined();
  });
});

describe("parseProposeCaseType reserved attribute names", () => {
  it("renames a dataset attribute named status rather than dropping it", () => {
    const parsed = _parseWithFields({
      attributes: [
        {
          datasetId: DEATHS_DATASET_ID,
          columnId: STATE_COLUMN_ID,
          name: "Status",
          isIncluded: true,
          valuePickerRuleType: "most_frequent",
        },
      ],
    });

    expect(parsed?.attributes[0]?.name).toBe("Status (attribute)");
  });

  it("renames a manual-entry attribute named status", () => {
    const parsed = _parseWithFields({
      manualEntryAttributes: [{ name: " status ", isIncluded: true }],
    });

    expect(parsed?.manualEntryAttributes[0]?.name).toBe("status (attribute)");
  });
});

const DEATHS_TOTAL_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";

/** The catalog columns' ids and Ava types. */
const CATALOG_COLUMNS = [
  { id: STATE_COLUMN_ID, data_type: "varchar" },
  { id: DEATHS_TOTAL_COLUMN_ID, data_type: "bigint" },
];

/** A one-field draft over the deaths dataset, reading `columnId`. */
function _buildDraftArgsReadingColumn(
  columnId: string,
  ruleType: string,
): string {
  return JSON.stringify({
    name: "County record",
    sourceDatasets: [
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
    ],
    attributes: [
      {
        datasetId: DEATHS_DATASET_ID,
        columnId,
        name: "Field",
        isIncluded: true,
        valuePickerRuleType: ruleType,
      },
    ],
    manualEntryAttributes: [],
  });
}

describe("parseProposeCaseType value rules", () => {
  it("replaces a sum over a text column with most_frequent", () => {
    const parsed = parseProposeCaseType(
      _buildDraftArgsReadingColumn(STATE_COLUMN_ID, "sum"),
      {
        columns: CATALOG_COLUMNS,
      },
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("most_frequent");
  });

  it("keeps a sum over a whole-number column", () => {
    const parsed = parseProposeCaseType(
      _buildDraftArgsReadingColumn(DEATHS_TOTAL_COLUMN_ID, "sum"),
      { columns: CATALOG_COLUMNS },
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("sum");
  });

  it("keeps the model's rule for a column the catalog does not list", () => {
    const parsed = parseProposeCaseType(
      _buildDraftArgsReadingColumn(STATE_COLUMN_ID, "sum"),
      {
        columns: [],
      },
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("sum");
  });

  it("keeps the model's rule for a column whose type is not an Ava type", () => {
    const parsed = parseProposeCaseType(
      _buildDraftArgsReadingColumn(STATE_COLUMN_ID, "sum"),
      {
        columns: [{ id: STATE_COLUMN_ID, data_type: "geometry" }],
      },
    );

    expect(parsed?.attributes[0]?.valuePickerRuleType).toBe("sum");
  });
});
