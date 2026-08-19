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

describe("parseProposeCaseType", () => {
  it("parses a draft that joins columns from two datasets", () => {
    const parsed = parseProposeCaseType(
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
    const parsed = parseProposeCaseType(
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
    const parsed = parseProposeCaseType(
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

  it("includes attributes by default and falls back to most_frequent", () => {
    const parsed = parseProposeCaseType(
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
        valuePickerRuleType: "most_frequent",
      },
    ]);
    expect(parsed?.allowManualCreation).toBe(false);
    expect(parsed?.manualEntryAttributes).toEqual([]);
  });

  it("rejects an unknown value picker rule instead of passing it on", () => {
    const parsed = parseProposeCaseType(
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
    const parsed = parseProposeCaseType(
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
    const parsed = parseProposeCaseType(
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
      parseProposeCaseType(
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
    expect(
      parseProposeCaseType(JSON.stringify({ name: "Doctor" })),
    ).toBeUndefined();
    expect(
      parseProposeCaseType(
        JSON.stringify({
          name: "Doctor",
          sourceDatasets: [{ datasetId: DEATHS_DATASET_ID }],
        }),
      ),
    ).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    expect(parseProposeCaseType("{not json")).toBeUndefined();
    expect(parseProposeCaseType(undefined)).toBeUndefined();
  });
});
