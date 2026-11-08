/**
 * The editor holds every tweak the user makes to a proposed draft, so these
 * cover the edits that change what gets persisted: inclusion, naming, value
 * pickers, and the primary key / label interaction.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCaseTypeDraftEditor } from "./useCaseTypeDraftEditor";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ChatProposedCaseType } from "$/types/chat.types";

const DATASET_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATASET_ID = "0f2c9f3e-bbbb-4bbb-8ccc-ddddeeeeffff";
const PK_COLUMN_ID = "1a2b3c4d-aaaa-4bbb-8ccc-ddddeeeeffff";
const STATE_COLUMN_ID = "2b3c4d5e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_KEY_COLUMN_ID = "3c4d5e6f-aaaa-4bbb-8ccc-ddddeeeeffff";
const POPULATION_COLUMN_ID = "4d5e6f70-aaaa-4bbb-8ccc-ddddeeeeffff";
const CENSUS_DATE_COLUMN_ID = "5e6f7081-bbbb-4bbb-8ccc-ddddeeeeffff";

function makeDraft(): ChatProposedCaseType {
  return {
    name: "COVID death record",
    description: "One reported death",
    allowManualCreation: false,
    sourceDatasets: [
      { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
      },
    ],
    labelColumnId: STATE_COLUMN_ID,
    attributes: [
      {
        datasetId: DATASET_ID,
        columnId: PK_COLUMN_ID,
        name: "Row id",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "first",
      },
      {
        datasetId: DATASET_ID,
        columnId: STATE_COLUMN_ID,
        name: "State",
        isIncluded: true,
        valueShape: "single",
        valuePickerRuleType: "most_frequent",
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
    manualEntryAttributes: [{ name: "Review notes", isIncluded: false }],
  };
}

describe("useCaseTypeDraftEditor", () => {
  it("switches a field to every value and back, keeping its value picker", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    const listed = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(listed?.valueShape).toBe("list");

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "single");
    });
    const single = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(single).toMatchObject({
      valueShape: "single",
      valuePickerRuleType: "max",
    });
  });

  it("keeps a field to one value once it becomes the label", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    act(() => {
      result.current.setLabelColumnId(POPULATION_COLUMN_ID);
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("keeps a field to one value once it becomes a join key", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "list");
    });
    act(() => {
      result.current.setPrimaryKeyColumnId(
        CENSUS_DATASET_ID,
        POPULATION_COLUMN_ID,
      );
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("refuses to make the label keep every value", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValueShape(STATE_COLUMN_ID, "list");
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === STATE_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("toggles an attribute's inclusion without touching the others", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.toggleAttribute(STATE_COLUMN_ID);
    });

    expect(result.current.draft.attributes).toMatchObject([
      { columnId: PK_COLUMN_ID, isIncluded: true },
      { columnId: STATE_COLUMN_ID, isIncluded: false },
      { columnId: CENSUS_KEY_COLUMN_ID, isIncluded: true },
      { columnId: POPULATION_COLUMN_ID, isIncluded: true },
    ]);
  });

  it("renames a single attribute", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeName(STATE_COLUMN_ID, "Reporting state");
    });

    expect(result.current.draft.attributes[1]?.name).toBe("Reporting state");
    expect(result.current.draft.attributes[0]?.name).toBe("Row id");
  });

  it("changes one attribute's value picker", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeValuePicker(STATE_COLUMN_ID, "max");
    });

    expect(result.current.draft.attributes[1]?.valuePickerRuleType).toBe("max");
  });

  it("changes one dataset's join key and leaves the other alone", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.toggleAttribute(STATE_COLUMN_ID);
    });
    act(() => {
      result.current.setPrimaryKeyColumnId(DATASET_ID, STATE_COLUMN_ID);
    });

    expect(result.current.draft.sourceDatasets).toEqual([
      { datasetId: DATASET_ID, primaryKeyColumnId: STATE_COLUMN_ID },
      {
        datasetId: CENSUS_DATASET_ID,
        primaryKeyColumnId: CENSUS_KEY_COLUMN_ID,
      },
    ]);
    // The new key must be mapped, or its dataset cannot be matched to a case.
    expect(result.current.draft.attributes[1]?.isIncluded).toBe(true);
  });

  it("groups attributes by the dataset each one reads", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    expect(
      result.current.sourceGroups.map((group) => {
        return [
          group.datasetId,
          group.attributes.map((attribute) => {
            return attribute.name;
          }),
        ];
      }),
    ).toEqual([
      [DATASET_ID, ["Row id", "State"]],
      [CENSUS_DATASET_ID, ["Census county code", "Population"]],
    ]);
  });

  it("removes a source dataset with its attributes", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.removeSourceDataset(CENSUS_DATASET_ID);
    });

    expect(result.current.draft.sourceDatasets).toEqual([
      { datasetId: DATASET_ID, primaryKeyColumnId: PK_COLUMN_ID },
    ]);
    // Leaving its attributes behind would point them at a source with no key.
    expect(
      result.current.draft.attributes.every((attribute) => {
        return attribute.datasetId === DATASET_ID;
      }),
    ).toBe(true);
  });

  it("blocks creation once every source dataset is removed", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.removeSourceDataset(DATASET_ID);
    });
    act(() => {
      result.current.removeSourceDataset(CENSUS_DATASET_ID);
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("includes a newly chosen label column", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.toggleAttribute(STATE_COLUMN_ID);
    });
    act(() => {
      result.current.setLabelColumnId(STATE_COLUMN_ID);
    });

    expect(result.current.draft.attributes[1]?.isIncluded).toBe(true);
  });

  it("adds a manual entry attribute already included", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.addManualEntryAttribute("Triage status");
    });

    expect(result.current.draft.manualEntryAttributes).toMatchObject([
      { name: "Review notes", isIncluded: false },
      { name: "Triage status", isIncluded: true },
    ]);
  });

  it("ignores a blank or duplicate manual entry attribute", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.addManualEntryAttribute("   ");
    });
    act(() => {
      result.current.addManualEntryAttribute("Review notes");
    });

    expect(result.current.draft.manualEntryAttributes).toHaveLength(1);
  });

  it("toggles a manual entry attribute by name", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.toggleManualEntryAttribute("Review notes");
    });

    expect(result.current.draft.manualEntryAttributes[0]?.isIncluded).toBe(
      true,
    );
  });

  it("blocks creation while the name is blank", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    expect(result.current.canCreate).toBe(true);

    act(() => {
      result.current.setName("  ");
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("re-initializes when the model proposes a revised draft", () => {
    const { result, rerender } = renderHook(
      ({ draft }: { draft: ChatProposedCaseType }) => {
        return useCaseTypeDraftEditor(draft);
      },
      { initialProps: { draft: makeDraft() } },
    );

    act(() => {
      result.current.setName("Edited locally");
    });
    rerender({ draft: { ...makeDraft(), name: "Revised proposal" } });

    expect(result.current.draft.name).toBe("Revised proposal");
  });

  it("starts from the proposed statuses with the named default", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor({
        ...makeDraft(),
        statuses: [
          { name: "Suspected", description: "", color: "#fab005" },
          { name: "Confirmed", description: "", color: "#fa5252" },
        ],
        defaultStatusName: "Confirmed",
      });
    });

    const { statusSet } = result.current;
    expect(
      statusSet.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Suspected", "Confirmed"]);
    expect(statusSet.defaultStatusId).toBe(statusSet.statuses[1]?.id);
  });

  it("starts from the default statuses when the proposal has none", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    expect(
      result.current.statusSet.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
  });

  it("carries an edited status set into the draft it creates", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });
    const [active, inactive] = result.current.statusSet.statuses;
    const edited: ConceptStatus.SetValue = {
      statuses: [{ ...active!, name: " Open " }, inactive!],
      defaultStatusId: inactive!.id,
    };

    act(() => {
      result.current.setStatusSet(edited);
    });

    expect(
      result.current.draft.statuses?.map((status) => {
        return status.name;
      }),
    ).toEqual(["Open", "Inactive"]);
    expect(result.current.draft.defaultStatusName).toBe("Inactive");
  });

  it("blocks creation while the status set has a problem", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setStatusSet({ statuses: [], defaultStatusId: undefined });
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("blocks creation while an included attribute is named status", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeName(STATE_COLUMN_ID, " Status ");
    });

    expect(result.current.canCreate).toBe(false);
  });

  it("refuses a hand-filled field named status", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.addManualEntryAttribute("status");
    });

    expect(
      result.current.draft.manualEntryAttributes.map((attribute) => {
        return attribute.name;
      }),
    ).toEqual(["Review notes"]);
  });

  it("keeps a column's value per month by the date column chosen", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === POPULATION_COLUMN_ID;
      }),
    ).toMatchObject({
      valueShape: "bucketed_list",
      bucketGrain: "month",
      bucketColumnId: CENSUS_DATE_COLUMN_ID,
      valuePickerRuleType: "max",
    });
  });

  it("drops the period when a column goes back to one value", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });
    act(() => {
      result.current.setAttributeValueShape(POPULATION_COLUMN_ID, "single");
    });

    const population = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(population?.valueShape).toBe("single");
    expect(population).not.toHaveProperty("bucketGrain");
    expect(population).not.toHaveProperty("bucketColumnId");
  });

  it("keeps a join key at one value when asked for a period", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(PK_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });

    expect(
      result.current.draft.attributes.find((attribute) => {
        return attribute.columnId === PK_COLUMN_ID;
      })?.valueShape,
    ).toBe("single");
  });

  it("drops a column's period when it becomes the label", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: CENSUS_DATE_COLUMN_ID,
      });
    });
    act(() => {
      result.current.setLabelColumnId(POPULATION_COLUMN_ID);
    });

    const population = result.current.draft.attributes.find((attribute) => {
      return attribute.columnId === POPULATION_COLUMN_ID;
    });
    expect(population?.valueShape).toBe("single");
    expect(population).not.toHaveProperty("bucketGrain");
  });

  it("cannot create while an included per-period field has no date column", () => {
    const { result } = renderHook(() => {
      return useCaseTypeDraftEditor(makeDraft());
    });

    act(() => {
      result.current.setAttributeBucket(POPULATION_COLUMN_ID, {
        bucketGrain: "month",
        bucketColumnId: undefined,
      });
    });

    expect(result.current.canCreate).toBe(false);
  });
});
