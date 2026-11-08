import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnMappingCreator } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/DatasetColumnMappingCreator";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

// `makeDefaultDatasetColumnAttribute` reads only the dataset's id.
const DATASET = { id: uuid<Dataset.Id>() } as Dataset.T;

/** The creator for one field, "district", over a column of the given type. */
function CreatorHarness({
  columnDataType,
  isIdentifierColumn = false,
  isLabelColumn = false,
}: Readonly<{
  columnDataType: AvaDataType.T;
  /** Whether the dataset's ID column is the one this field reads. */
  isIdentifierColumn?: boolean;
  /** Whether the case type's title is the field this one reads. */
  isLabelColumn?: boolean;
}>): React.ReactNode {
  const defaults = getDefaultConceptFormValues();
  const column = {
    id: uuid<DatasetColumn.Id>(),
    name: "district",
    dataType: columnDataType,
  } as DatasetColumn.T;
  const attribute = makeDefaultDatasetColumnAttribute({
    conceptId: defaults.id,
    name: "district",
    dataset: DATASET,
    datasetColumn: column,
  });
  const conceptForm: FormType<ConceptFormValues> = useForm({
    mode: "uncontrolled",
    initialValues: {
      ...defaults,
      datasetColumnAttributes: [
        {
          ...attribute,
          // The user had picked "count" before making this the ID column.
          mappings: {
            ...attribute.mappings,
            datasetColumn: {
              ...attribute.mappings.datasetColumn,
              valuePickerRuleType: "count",
            },
          },
        },
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
        isIdentifierColumn={isIdentifierColumn}
        isLabelColumn={isLabelColumn}
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
  it("offers no sum or average for a text column", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
      "Choose the value that comes last alphabetically",
      "Choose the value that comes first alphabetically",
    ]);
  });

  it("labels max and min alphabetically on a text column", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(_offeredRules()).toContain(
      "Choose the value that comes last alphabetically",
    );
    expect(_offeredRules()).toContain(
      "Choose the value that comes first alphabetically",
    );
  });

  it("offers neither maximum nor minimum for a yes/no column", () => {
    render(<CreatorHarness columnDataType="boolean" />);

    expect(_offeredRules()).toEqual([
      "Choose the most frequent value",
      "Choose the first value we see",
      "Get a count of how many values there are",
    ]);
  });

  it("names max and min plainly on a number column", () => {
    render(<CreatorHarness columnDataType="bigint" />);

    expect(_offeredRules()).toContain("Choose the maximum value");
    expect(_offeredRules()).toContain("Choose the minimum value");
  });

  it("locks the rule select to the default for the dataset's ID column", () => {
    render(<CreatorHarness columnDataType="varchar" isIdentifierColumn />);

    const select = screen.getByRole("combobox", {
      name: /If there are multiple district values/,
    });
    expect(select).toBeDisabled();
    expect(select).toHaveValue("Choose the most frequent value");
    expect(select).toHaveAccessibleDescription(
      "ID fields keep their value as is.",
    );
  });

  it("leaves the rule select open for any other column", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    const select = screen.getByRole("combobox", {
      name: /If there are multiple district values/,
    });
    expect(select).toBeEnabled();
    expect(select).not.toHaveAccessibleDescription();
  });

  it("offers the one value or every value switch instead of a checkbox", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(
      screen.getByRole("radiogroup", {
        name: "One value or every value for district",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Only allow one value" }),
    ).not.toBeInTheDocument();
  });

  it("hides the rule select once the field keeps every value", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    fireEvent.click(screen.getByRole("radio", { name: "Every value" }));

    expect(
      screen.queryByRole("combobox", {
        name: /If there are multiple district values/,
      }),
    ).not.toBeInTheDocument();
  });

  it("brings the rule select back when the field keeps one value again", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    fireEvent.click(screen.getByRole("radio", { name: "Every value" }));
    fireEvent.click(screen.getByRole("radio", { name: "One value" }));

    expect(
      screen.getByRole("combobox", {
        name: /If there are multiple district values/,
      }),
    ).toBeEnabled();
  });

  it("locks the switch to one value for the dataset's ID column", () => {
    render(<CreatorHarness columnDataType="varchar" isIdentifierColumn />);

    expect(screen.getByRole("radio", { name: "One value" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Every value" })).toBeDisabled();
  });

  it("says why the switch is locked for the dataset's ID column", () => {
    render(<CreatorHarness columnDataType="varchar" isIdentifierColumn />);

    expect(
      screen.getByRole("radiogroup", {
        name: "One value or every value for district",
      }),
    ).toHaveAccessibleDescription("ID fields keep their value as is.");
  });

  it("locks the switch to one value for the title field", () => {
    render(<CreatorHarness columnDataType="varchar" isLabelColumn />);

    expect(screen.getByRole("radio", { name: "One value" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Every value" })).toBeDisabled();
    expect(
      screen.getByRole("radiogroup", {
        name: "One value or every value for district",
      }),
    ).toHaveAccessibleDescription("The title field keeps one value.");
  });

  it("leaves the switch open and unexplained for any other field", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    expect(screen.getByRole("radio", { name: "Every value" })).toBeEnabled();
    expect(
      screen.getByRole("radiogroup", {
        name: "One value or every value for district",
      }),
    ).not.toHaveAccessibleDescription();
  });

  it("keeps the picked rule when the field switches to every value and back", () => {
    render(<CreatorHarness columnDataType="varchar" />);

    pickMantineSelectOption(
      /If there are multiple district values/,
      "Choose the first value we see",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Every value" }));
    fireEvent.click(screen.getByRole("radio", { name: "One value" }));

    expect(
      screen.getByRole("combobox", {
        name: /If there are multiple district values/,
      }),
    ).toHaveValue("Choose the first value we see");
  });
});
