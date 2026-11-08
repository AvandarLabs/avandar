/**
 * The draft card hands its edited state straight to the concept insert path, so
 * this conversion decides what actually gets persisted: which attributes
 * the user left checked, which labels the case, and the value picker.
 *
 * A draft spanning several datasets is the normal case, so the join keys each
 * source is matched on are covered here too.
 */
import { describe, expect, it } from "vitest";
import { proposedCaseTypeToCreatedCaseType } from "@/views/OntologyDesignerApp/proposedCaseTypeToCreatedCaseType/proposedCaseTypeToCreatedCaseType";
import type { ChatProposedCaseType } from "$/types/chat.types";

const DEATHS_DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATASET_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const DEATHS_KEY_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_KEY_COLUMN_ID = "1a2b3c4d-bbbb-4bbb-8ccc-ddddeeeeffff";
const STATE_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";
const DEATHS_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";
const POPULATION_COLUMN_ID = "4d5e6f70-aaaa-4bbb-8ccc-ddddeeeeffff";

function makeDraft(
  overrides: Partial<ChatProposedCaseType> = {},
): ChatProposedCaseType {
  return {
    name: "County COVID record",
    description: "One county's reported deaths",
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
        columnId: DEATHS_KEY_COLUMN_ID,
        name: "County code",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: STATE_COLUMN_ID,
        name: "State",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "max",
      },
      {
        datasetId: DEATHS_DATASET_ID,
        columnId: DEATHS_COLUMN_ID,
        name: "Total deaths",
        isIncluded: false,
        valueShape: "single",
        valuePickerRuleType: "sum",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: CENSUS_KEY_COLUMN_ID,
        name: "Census county code",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: CENSUS_DATASET_ID,
        columnId: POPULATION_COLUMN_ID,
        name: "Population",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "max",
      },
    ],
    manualEntryAttributes: [
      { name: "Review notes", isIncluded: true },
      { name: "Triage status", isIncluded: false },
    ],
    ...overrides,
  };
}

describe("proposedCaseTypeToCreatedCaseType", () => {
  it("keeps only the attributes the user left included", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());

    const names = created.attributes.map((attribute) => {
      return attribute.name;
    });
    expect(names).toEqual([
      "County code",
      "State",
      "Census county code",
      "Population",
      "Review notes",
    ]);
  });

  it("keeps attributes from every contributing dataset", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());
    const population = created.attributes.find((attribute) => {
      return attribute.name === "Population";
    });

    expect(population).toMatchObject({
      kind: "dataset_column",
      datasetId: CENSUS_DATASET_ID,
      columnId: POPULATION_COLUMN_ID,
      valuePickerRuleType: "max",
    });
  });

  it("carries a join key for each contributing dataset", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());

    expect(created.identities).toEqual([
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
      },
    ]);
  });

  it("drops a source dataset the user emptied of attributes", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.filter((attribute) => {
        return attribute.datasetId !== CENSUS_DATASET_ID;
      }),
    });

    expect(created.identities).toEqual([
      {
        datasetId: DEATHS_DATASET_ID,
        primaryKeyColumnId: DEATHS_KEY_COLUMN_ID,
      },
    ]);
  });

  it("carries each value picker through to the insert payload", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());
    const state = created.attributes.find((attribute) => {
      return attribute.name === "State";
    });

    expect(state).toMatchObject({
      kind: "dataset_column",
      datasetId: DEATHS_DATASET_ID,
      columnId: STATE_COLUMN_ID,
      valuePickerRuleType: "max",
    });
  });

  it("carries a field switched to every value without a value rule", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID
          ? { ...attribute, valueShape: "list" }
          : attribute;
      }),
    });
    const population = created.attributes.find((attribute) => {
      return attribute.name === "Population";
    });

    expect(population).toMatchObject({ valueShape: "list" });
    expect(population).not.toHaveProperty("valuePickerRuleType");
  });

  it("keeps the label and every join key to one value", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return { ...attribute, valueShape: "list" };
      }),
    });

    expect(
      created.attributes
        .filter((attribute) => {
          return ["State", "County code", "Census county code"].includes(
            attribute.name,
          );
        })
        .map((attribute) => {
          return "valueShape" in attribute ? attribute.valueShape : undefined;
        }),
    ).toEqual(["single", "single", "single"]);
  });

  it("marks the label column as the label attribute", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());
    const labelled = created.attributes.filter((attribute) => {
      return attribute.kind === "dataset_column" && attribute.isLabel;
    });

    expect(
      labelled.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["State"]);
  });

  it("labels the first join key when the label column was excluded", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.columnId === STATE_COLUMN_ID
          ? { ...attribute, isIncluded: false }
          : attribute;
      }),
    });
    const labelled = created.attributes.filter((attribute) => {
      return attribute.kind === "dataset_column" && attribute.isLabel;
    });

    expect(
      labelled.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["County code"]);
  });

  it("re-includes a join key the user unchecked", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.columnId === CENSUS_KEY_COLUMN_ID
          ? { ...attribute, isIncluded: false }
          : attribute;
      }),
    });

    expect(
      created.attributes.some((attribute) => {
        return (
          attribute.kind === "dataset_column" &&
          attribute.columnId === CENSUS_KEY_COLUMN_ID
        );
      }),
    ).toBe(true);
  });

  it("carries description and manual creation onto the case type", () => {
    const created = proposedCaseTypeToCreatedCaseType(
      makeDraft({ allowManualCreation: true }),
    );

    expect(created).toMatchObject({
      name: "County COVID record",
      description: "One county's reported deaths",
      allowManualCreation: true,
    });
  });

  it("carries the card's statuses and default into the created case type", () => {
    const created = proposedCaseTypeToCreatedCaseType(
      makeDraft({
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      }),
    );

    expect(
      created.statuses?.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(created.defaultStatusName).toBe("Confirmed");
  });

  it("leaves statuses out when the draft has none", () => {
    const created = proposedCaseTypeToCreatedCaseType(makeDraft());

    expect(created).not.toHaveProperty("statuses");
    expect(created).not.toHaveProperty("defaultStatusName");
  });

  it("carries a per-year field's rule, period, and date column", () => {
    const draft = makeDraft();
    const created = proposedCaseTypeToCreatedCaseType({
      ...draft,
      attributes: draft.attributes.map((attribute) => {
        return attribute.name === "Population"
          ? {
              ...attribute,
              valueShape: "bucketed_list",
              bucketGrain: "year",
              bucketColumnId: "6f708192-cccc-4bbb-8ccc-ddddeeeeffff",
            }
          : attribute;
      }),
    });

    expect(
      created.attributes.find((attribute) => {
        return attribute.name === "Population";
      }),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "year",
      bucketColumnId: "6f708192-cccc-4bbb-8ccc-ddddeeeeffff",
      valuePickerRuleType: "max",
    });
  });
});
