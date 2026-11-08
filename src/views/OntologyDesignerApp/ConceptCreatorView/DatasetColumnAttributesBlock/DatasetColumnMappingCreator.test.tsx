import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { render, within } from "@/test-utils";
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnMappingCreator } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

// `makeDefaultDatasetColumnAttribute` reads only the dataset's id.
const DATASET = { id: uuid<DatasetId>() } as Dataset.T;

/** The creator for one field, "district", over a column of the given type. */
function CreatorHarness({
  columnDataType,
}: Readonly<{ columnDataType: AvaDataType.T }>): React.ReactNode {
  const defaults = getDefaultConceptFormValues();
  const conceptForm: FormType<ConceptFormValues> = useForm({
    mode: "uncontrolled",
    initialValues: {
      ...defaults,
      datasetColumnAttributes: [
        makeDefaultDatasetColumnAttribute({
          conceptId: defaults.id,
          name: "district",
          dataset: DATASET,
          datasetColumn: {
            id: uuid<DatasetColumnId>(),
            name: "district",
            dataType: columnDataType,
          } as DatasetColumnRead,
        }),
      ],
    },
  });
  return (
    <ConceptCreatorStore.Provider>
      <DatasetColumnMappingCreator
        conceptForm={conceptForm}
        attributeIdx={0}
        attributeName="district"
        columnDataType={columnDataType}
      />
    </ConceptCreatorStore.Provider>
  );
}

/** The option labels the field's value rule select offers, in order. */
function _offeredRules(): string[] {
  return within(
    getMantineSelectDropdown(/If there are multiple district values/),
  )
    .queryAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}

describe("DatasetColumnMappingCreator", () => {
  it("offers no sum or average for a text column, and names max and min alphabetically", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
      "Choose the value that comes last alphabetically",
      "Choose the value that comes first alphabetically",
    ]);
  });

  it("offers neither maximum nor minimum for a yes/no column", () => {
    render(<CreatorHarness columnDataType="boolean" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
    ]);
  });
});
