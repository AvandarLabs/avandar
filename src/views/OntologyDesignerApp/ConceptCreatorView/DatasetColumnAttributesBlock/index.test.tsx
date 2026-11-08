import { useForm } from "@avandar/ui/hooks";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { act, fireEvent, render, screen, within } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import { getDefaultConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnAttributesBlock } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  ConceptFormSubmitValues,
  ConceptFormType,
  ConceptFormValues,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/** A text column of the Deaths dataset. */
function _makeColumn(name: string): DatasetColumn.T {
  return {
    id: uuid<DatasetColumn.Id>(),
    name,
    dataType: "varchar",
  } as DatasetColumn.T;
}

const DISTRICT_COLUMN = _makeColumn("district");
const COUNTY_COLUMN = _makeColumn("county");
// `readonly`, matching `Dataset.WithColumns.columns`, so one `as` suffices.
const COLUMNS: readonly DatasetColumn.T[] = [DISTRICT_COLUMN, COUNTY_COLUMN];
const DEATHS = {
  id: uuid<Dataset.Id>(),
  name: "Deaths",
  columns: COLUMNS,
} as Dataset.WithColumns;

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAllDatasetsWithColumns: () => {
        return [[DEATHS], false];
      },
    },
  };
});

// The real list reads two backend clients. This stand-in offers each column
// as a button and reports it the way the real list does.
vi.mock("@/components/DatasetColumnPickerList", () => {
  return {
    DatasetColumnPickerList: ({
      onChange,
    }: {
      onChange: (value: DatasetColumn.Id) => void;
    }) => {
      return COLUMNS.map((column) => {
        return (
          <button
            key={column.id}
            type="button"
            onClick={() => {
              onChange(column.id);
            }}
          >
            {`Pick ${column.name}`}
          </button>
        );
      });
    },
  };
});

/**
 * Picks a column in the ID select. It has a placeholder but no label, so it
 * is found by placeholder, and its dropdown by its position among the
 * comboboxes (see `pickMantineSelectOption`).
 */
function _pickColumnAsId(columnName: string): void {
  const idSelect = screen.getByPlaceholderText("Select a field");
  const selectIdx = screen.getAllByRole("combobox").indexOf(idSelect);
  fireEvent.click(idSelect);
  fireEvent.focus(idSelect);
  const dropdown = document.querySelectorAll<HTMLElement>(
    ".mantine-Select-dropdown",
  )[selectIdx];
  fireEvent.click(
    within(dropdown!).getByRole("option", { name: columnName, hidden: true }),
  );
}

/**
 * Renders the block over a fresh form. `onForm` receives the form, so a test
 * can set the title field the way the page's select does.
 */
function BlockHarness({
  onForm,
}: Readonly<{
  onForm?: (conceptForm: ConceptFormType) => void;
}>): React.ReactNode {
  const conceptForm = useForm<ConceptFormValues, ConceptFormSubmitValues>({
    mode: "uncontrolled",
    initialValues: getDefaultConceptFormValues(),
    transformValues: (values) => {
      return { ...values, attributes: [] };
    },
  });
  onForm?.(conceptForm);
  return (
    <ConceptCreatorStore.Provider>
      <DatasetColumnAttributesBlock
        conceptForm={conceptForm}
        conceptId={conceptForm.getValues().id}
        conceptName="Death"
      />
    </ConceptCreatorStore.Provider>
  );
}

describe("DatasetColumnAttributesBlock", () => {
  it("locks a field's rule when its column is picked as the ID after another column", () => {
    render(<BlockHarness />);
    fireEvent.click(screen.getByText("Pick district"));
    fireEvent.click(
      screen.getByRole("button", { name: "Add column as a field" }),
    );
    fireEvent.click(screen.getByText("Pick county"));
    fireEvent.click(
      screen.getByRole("button", { name: "Add column as a field" }),
    );
    pickMantineSelectOption(
      /If there are multiple district values/,
      "Get a count of how many values there are",
    );
    // The first pick changes the form's dirty state and re-renders it
    // incidentally. Only a watch on the picks themselves catches a later one.
    _pickColumnAsId("county");

    _pickColumnAsId("district");

    const ruleSelect = screen.getByRole("combobox", {
      name: /If there are multiple district values/,
    });
    expect(ruleSelect).toBeDisabled();
    expect(ruleSelect).toHaveValue("Choose the most frequent value");
  });

  describe("a key field and the title field", () => {
    let conceptForm: ConceptFormType;

    /** Adds the district and county fields, with district selected. */
    function _addDistrictAndCounty(): void {
      render(
        <BlockHarness
          onForm={(form) => {
            conceptForm = form;
          }}
        />,
      );
      for (const columnName of ["district", "county"]) {
        fireEvent.click(screen.getByText(`Pick ${columnName}`));
        fireEvent.click(
          screen.getByRole("button", { name: "Add column as a field" }),
        );
      }
    }

    function _getFieldId(fieldName: string): ConceptAttribute.Id {
      const field = conceptForm
        .getValues()
        .datasetColumnAttributes.find((attribute) => {
          return attribute.name === fieldName;
        });
      return field!.id;
    }

    it("locks its field's switch to one value", () => {
      _addDistrictAndCounty();
      expect(screen.getByRole("radio", { name: "Every value" })).toBeEnabled();

      act(() => {
        conceptForm.setFieldValue("labelAttributeId", _getFieldId("district"));
      });

      expect(screen.getByRole("radio", { name: "One value" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Every value" })).toBeDisabled();
    });

    it("moves the lock when the title changes to another field", () => {
      _addDistrictAndCounty();
      act(() => {
        conceptForm.setFieldValue("labelAttributeId", _getFieldId("district"));
      });

      act(() => {
        conceptForm.setFieldValue("labelAttributeId", _getFieldId("county"));
      });

      expect(screen.getByRole("radio", { name: "Every value" })).toBeEnabled();
      fireEvent.click(screen.getByRole("radio", { name: "county" }));
      expect(screen.getByRole("radio", { name: "Every value" })).toBeDisabled();
    });

    it("stores its field as one value, though it kept every value before", () => {
      _addDistrictAndCounty();
      fireEvent.click(screen.getByRole("radio", { name: "Every value" }));
      const districtIdx = conceptForm
        .getValues()
        .datasetColumnAttributes.findIndex((attribute) => {
          return attribute.name === "district";
        });
      expect(
        conceptForm.getValues().datasetColumnAttributes[districtIdx]?.isArray,
      ).toBe(true);

      act(() => {
        conceptForm.setFieldValue("labelAttributeId", _getFieldId("district"));
      });

      expect(
        conceptForm.getValues().datasetColumnAttributes[districtIdx]?.isArray,
      ).toBe(false);
    });

    it("stores a field as one value when its column becomes the ID", () => {
      _addDistrictAndCounty();
      fireEvent.click(screen.getByRole("radio", { name: "Every value" }));

      _pickColumnAsId("district");

      expect(screen.getByRole("radio", { name: "One value" })).toBeChecked();
      expect(
        conceptForm.getValues().datasetColumnAttributes.find((attribute) => {
          return attribute.name === "district";
        })?.isArray,
      ).toBe(false);
    });
  });
});
