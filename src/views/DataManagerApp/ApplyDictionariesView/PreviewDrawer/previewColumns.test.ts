import { describe, expect, it } from "vitest";
import {
  COUNTY,
  GENDER,
  makeApplyLookups,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import {
  buildPreviewColumns,
  getPreviewCellStatus,
} from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/previewColumns";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const HOSP = { ...GENDER, id: "col-hosp" as DatasetColumn.Id, name: "hosp_yn" };
const UNMATCHED = new Map([
  [
    GENDER.id,
    [
      { value: "7", valueKey: "7", rowCount: 3 },
      { value: "8", valueKey: "8", rowCount: 1 },
    ],
  ],
]);

describe("previewColumns", () => {
  it("converts converting columns, tags reference ones, and tints what stays unmatched", () => {
    const plans = buildPreviewColumns({
      columns: [GENDER, HOSP, COUNTY],
      picks: {
        [GENDER.id]: SEX_PICK,
        [HOSP.id]: { ...SEX_PICK, mode: "reference" },
      },
      codeLists: makeApplyLookups().codeLists,
      resolutions: { [GENDER.id]: { "8": { action: "empty" } } },
      unmatchedByColumnId: UNMATCHED,
    });

    expect(
      plans.map((plan) => {
        return plan.column.name;
      }),
    ).toEqual(["GENDER", "hosp_yn", "county"]);
    expect(plans[0]?.conversion?.overrides).toEqual([
      { value: "8", action: "empty" },
    ]);
    expect([...(plans[0]?.unmatchedKeys ?? [])]).toEqual(["7"]);
    expect(plans[1]).toMatchObject({
      conversion: undefined,
      isReference: true,
      isTouched: true,
    });
    expect(plans[2]).toMatchObject({
      conversion: undefined,
      isReference: false,
      isTouched: false,
    });
  });

  it("calls a cell changed, unmatched, or plain", () => {
    const unmatchedKeys = new Set(["7"]);

    expect(
      getPreviewCellStatus({ raw: "1", converted: "Male" }, unmatchedKeys),
    ).toBe("changed");
    expect(
      getPreviewCellStatus({ raw: " 7", converted: " 7" }, unmatchedKeys),
    ).toBe("unmatched");
    expect(
      getPreviewCellStatus(
        { raw: "Bronx", converted: undefined },
        unmatchedKeys,
      ),
    ).toBe("plain");
  });
});
