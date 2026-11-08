import { describe, expect, it } from "vitest";
/**
 * Chat-created case types must become the same form payload the concept
 * creator submits: identity column as identifier, requested label, mappings.
 */
import { uuid } from "$/lib/uuid";
import { createdCaseTypeToFormValues } from "./createdCaseTypeToFormValues";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatCreatedCaseType } from "$/types/chat.types";
import type { AttributeFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

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
        name: "Case status",
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

/** Converts a case type with one field, "Field", reading `columnId`. */
function _convertField(options: {
  columnId: string;
  datasetId: string;
  valuePickerRuleType: ValuePickerRule.T;
}): AttributeFormValues | undefined {
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
          name: "Field",
          kind: "dataset_column",
          datasetId: options.datasetId,
          columnId: options.columnId,
          valuePickerRuleType: options.valuePickerRuleType,
        },
      ],
    }),
    workspaceId: WORKSPACE_ID,
    columns: COLUMNS,
  });
  return formValues.attributes.find((attribute) => {
    return attribute.name === "Field";
  });
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
    expect(label?.name).toBe("Case status");
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
            name: "Case status",
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
      return attribute.name === "Case status";
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
      return attribute.name === "Case status";
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
            name: "Case status",
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

  it("starts a chat-created case type with the default status set", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase(),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
    expect(formValues.defaultStatusId).toBe(formValues.statuses[0]?.id);
  });

  it("renames a field called status so it does not collide with the built-in status", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        attributes: [
          {
            name: "Status",
            kind: "dataset_column",
            datasetId: DATASET_ID,
            columnId: STATUS_COLUMN_ID,
            isLabel: true,
          },
          { name: "status", kind: "manual_entry" },
        ],
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.attributes
        .map((attribute) => {
          return attribute.name;
        })
        .filter((name) => {
          return name.toLowerCase().startsWith("status");
        }),
    ).toEqual(["Status (attribute)", "status (attribute)"]);
  });

  it("starts a chat-created case type with the statuses chat proposed", () => {
    const formValues = createdCaseTypeToFormValues({
      caseType: _covidCase({
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      }),
      workspaceId: WORKSPACE_ID,
      columns: COLUMNS,
    });

    expect(
      formValues.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(formValues.defaultStatusId).toBe(formValues.statuses[1]?.id);
  });

  it("stores a count over a text column as a whole number", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "count",
    });

    expect(field?.dataType).toBe("bigint");
  });

  it("stores a sum of whole numbers as a decimal", () => {
    const field = _convertField({
      columnId: POPULATION_COLUMN_ID,
      datasetId: CENSUS_DATASET_ID,
      valuePickerRuleType: "sum",
    });

    expect(field?.dataType).toBe("double");
  });

  it("keeps a text column's type under max", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "max",
    });

    expect(field?.dataType).toBe("varchar");
  });

  it("replaces a sum over a text column with most_frequent", () => {
    const field = _convertField({
      columnId: STATUS_COLUMN_ID,
      datasetId: DATASET_ID,
      valuePickerRuleType: "sum",
    });

    expect(field?.mappings.datasetColumn.valuePickerRuleType).toBe(
      "most_frequent",
    );
    expect(field?.dataType).toBe("varchar");
  });
});
