import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatCreatedCaseType } from "$/types/chat.types";

import { describe, expect, it } from "vitest";

/**
 * Chat-created case types must become the same form payload the concept
 * creator submits: identity column as identifier, requested label, mappings.
 */
import { uuid } from "$/lib/uuid";

import { createdCaseTypeToFormValues } from "./createdCaseTypeToFormValues";

const DATASET_ID = uuid<DatasetId>();
const CENSUS_DATASET_ID = uuid<DatasetId>();
const PK_COLUMN_ID = uuid<DatasetColumnId>();
const STATUS_COLUMN_ID = uuid<DatasetColumnId>();
const CENSUS_KEY_COLUMN_ID = uuid<DatasetColumnId>();
const POPULATION_COLUMN_ID = uuid<DatasetColumnId>();
const WORKSPACE_ID = uuid<Workspace.Id>();

const COLUMNS = [
  {
    id: PK_COLUMN_ID,
    datasetId: DATASET_ID,
    name: "case_id",
    dataType: "varchar" as const,
  },
  {
    id: STATUS_COLUMN_ID,
    datasetId: DATASET_ID,
    name: "status",
    dataType: "varchar" as const,
  },
  {
    id: CENSUS_KEY_COLUMN_ID,
    datasetId: CENSUS_DATASET_ID,
    name: "fips",
    dataType: "varchar" as const,
  },
  {
    id: POPULATION_COLUMN_ID,
    datasetId: CENSUS_DATASET_ID,
    name: "population",
    dataType: "bigint" as const,
  },
];

function _covidCase(
  overrides?: Partial<ChatCreatedCaseType>,
): ChatCreatedCaseType {
  return {
    name: "COVID case",
    description: "A COVID-19 case record",
    allowManualCreation: false,
    identities: [{ datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID }],
    attributes: [
      {
        name: "Status",
        kind: "dataset_column",
        datasetId: DATASET_ID,
        columnId: STATUS_COLUMN_ID,
        isLabel: true,
      },
      { name: "Notes", kind: "manual_entry" },
    ],
    ...overrides,
  };
}

describe("createdCaseTypeToFormValues", () => {
  it("adds the identity column as an identifier when it is omitted from attributes", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase(),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const identifier = formValues.attributes.find((attribute) => {
      return attribute.isIdentifier;
    });
    expect(identifier?.name).toBe("case_id");
    expect(identifier?.mappingType).toBe("dataset_column");
    expect(identifier?.mappings.datasetColumn.datasetColumnId).toBe(
      PK_COLUMN_ID,
    );
    expect(identifier?.mappings.datasetColumn.datasetId).toBe(DATASET_ID);
  });

  it("marks the requested label and maps other attributes", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase(),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(formValues.name).toBe("COVID case");
    expect(formValues.description).toBe("A COVID-19 case record");
    const label = formValues.attributes.find((attribute) => {
      return attribute.isLabel;
    });
    expect(label?.name).toBe("Status");
    expect(label?.mappings.datasetColumn.datasetColumnId).toBe(
      STATUS_COLUMN_ID,
    );
    expect(formValues.labelAttributeId).toBe(label?.id);

    const notes = formValues.attributes.find((attribute) => {
      return attribute.name === "Notes";
    });
    expect(notes?.mappingType).toBe("manual_entry");
  });

  it("honors a requested value picker rule instead of forcing most_frequent", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          {
            name: "Status",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: STATUS_COLUMN_ID,
            isLabel: true,
            valuePickerRuleType: "max",
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const status = formValues.attributes.find((attribute) => {
      return attribute.name === "Status";
    });
    expect(status?.mappings.datasetColumn.valuePickerRuleType).toBe("max");
  });

  it("defaults the value picker rule to most_frequent when none is requested", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase(),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const status = formValues.attributes.find((attribute) => {
      return attribute.name === "Status";
    });
    expect(status?.mappings.datasetColumn.valuePickerRuleType).toBe(
      "most_frequent",
    );
  });

  it("maps attributes from every contributing dataset", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        identities: [
          { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
          {
            datasetId: CENSUS_DATASET_ID,
            primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            name: "Status",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: STATUS_COLUMN_ID,
            isLabel: true,
          },
          {
            name: "Population",
            kind: "dataset_column",
            datasetId: CENSUS_DATASET_ID,
            columnId: POPULATION_COLUMN_ID,
            valuePickerRuleType: "max",
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const population = formValues.attributes.find((attribute) => {
      return attribute.name === "Population";
    });
    expect(population?.mappings.datasetColumn.datasetId).toBe(
      CENSUS_DATASET_ID,
    );
    expect(population?.mappings.datasetColumn.valuePickerRuleType).toBe("max");
  });

  it("gives every contributing dataset its own identifier attribute", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        identities: [
          { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
          {
            datasetId: CENSUS_DATASET_ID,
            primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            name: "Population",
            kind: "dataset_column",
            datasetId: CENSUS_DATASET_ID,
            columnId: POPULATION_COLUMN_ID,
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    // Without one identifier per dataset the concept relation throws when it
    // is built, so both join keys must be mapped and flagged.
    const identifierDatasetIds = formValues.attributes
      .filter((attribute) => {
        return attribute.isIdentifier;
      })
      .map((attribute) => {
        return attribute.mappings.datasetColumn.datasetId;
      });
    expect(new Set(identifierDatasetIds)).toEqual(
      new Set([DATASET_ID, CENSUS_DATASET_ID]),
    );
  });

  it("flags a join key already mapped as an attribute rather than duplicating it", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        identities: [
          {
            datasetId: CENSUS_DATASET_ID,
            primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
        attributes: [
          {
            name: "County code",
            kind: "dataset_column",
            datasetId: CENSUS_DATASET_ID,
            columnId: CENSUS_KEY_COLUMN_ID,
          },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    const keyAttributes = formValues.attributes.filter((attribute) => {
      return (
        attribute.mappings.datasetColumn.datasetColumnId ===
        CENSUS_KEY_COLUMN_ID
      );
    });
    expect(keyAttributes).toHaveLength(1);
    expect(keyAttributes[0]?.name).toBe("County code");
    expect(keyAttributes[0]?.isIdentifier).toBe(true);
  });
});
