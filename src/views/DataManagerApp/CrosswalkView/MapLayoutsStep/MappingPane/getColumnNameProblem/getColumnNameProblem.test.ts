import { describe, expect, it } from "vitest";
import {
  CASE_ID_COLUMN,
  makeDraft,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { getColumnNameProblem } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/getColumnNameProblem/getColumnNameProblem";

describe("getColumnNameProblem", () => {
  const draft = makeDraft();

  it("refuses a blank name", () => {
    expect(getColumnNameProblem({ name: "   ", draft })).toBe("blank");
  });

  it("refuses another column's name, ignoring case and surrounding spaces", () => {
    expect(getColumnNameProblem({ name: " SEX ", draft })).toBe("taken");
  });

  it("lets a column keep its own name", () => {
    expect(
      getColumnNameProblem({
        name: "Case_ID",
        draft,
        exceptColumnId: CASE_ID_COLUMN.id,
      }),
    ).toBeUndefined();
  });

  it("refuses the source column's name only while the crosswalk adds it", () => {
    expect(getColumnNameProblem({ name: "Source_Dataset", draft })).toBe(
      "source_column",
    );
    expect(
      getColumnNameProblem({
        name: "source_dataset",
        draft: { ...draft, addsSourceColumn: false },
      }),
    ).toBeUndefined();
  });
});
