import { describe, expect, it } from "vitest";
import {
  BRONX_LAYOUT_ID,
  CASE_ID_COLUMN,
  makeDraft,
  ONSET_COLUMN,
  QUEENS_LAYOUT_ID,
  REFERENCE_LAYOUT_ID,
  SEX_COLUMN,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import {
  chooseSelectedColumnId,
  chooseShownLayout,
  findNextLayoutToMap,
  hasSuggestions,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/mapStepSelection/mapStepSelection";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

function _withStatuses(
  statuses: Record<string, CrosswalkDraft.Layout["status"]>,
): CrosswalkDraft.T {
  const draft = makeDraft();
  return {
    ...draft,
    layouts: draft.layouts.map((layout) => {
      return { ...layout, status: statuses[layout.id] ?? layout.status };
    }),
  };
}

describe("mapStepSelection", () => {
  it("shows the layout the search names, else the first to map, else the reference", () => {
    expect(chooseShownLayout(makeDraft(), BRONX_LAYOUT_ID)?.id).toBe(
      BRONX_LAYOUT_ID,
    );
    expect(chooseShownLayout(makeDraft(), "not-a-layout")?.id).toBe(
      QUEENS_LAYOUT_ID,
    );
    const allDone = _withStatuses({
      [QUEENS_LAYOUT_ID]: "mapped",
      [BRONX_LAYOUT_ID]: "skipped",
    });
    expect(chooseShownLayout(allDone, undefined)?.id).toBe(REFERENCE_LAYOUT_ID);
    expect(
      chooseShownLayout({ ...makeDraft(), layouts: [] }, undefined),
    ).toBeUndefined();
  });

  it("moves to the next layout to map after this one, wrapping, or to none", () => {
    expect(findNextLayoutToMap(makeDraft(), QUEENS_LAYOUT_ID)).toBe(
      BRONX_LAYOUT_ID,
    );
    expect(findNextLayoutToMap(makeDraft(), BRONX_LAYOUT_ID)).toBe(
      QUEENS_LAYOUT_ID,
    );
    const queensDone = _withStatuses({ [QUEENS_LAYOUT_ID]: "mapped" });
    expect(findNextLayoutToMap(queensDone, QUEENS_LAYOUT_ID)).toBe(
      BRONX_LAYOUT_ID,
    );
    const allDone = _withStatuses({
      [QUEENS_LAYOUT_ID]: "mapped",
      [BRONX_LAYOUT_ID]: "mapped",
    });
    expect(findNextLayoutToMap(allDone, BRONX_LAYOUT_ID)).toBeUndefined();
  });

  it("selects the chosen column, else the first one missing a fill or holding a suggestion", () => {
    const draft = makeDraft();
    expect(
      chooseSelectedColumnId(draft, QUEENS_LAYOUT_ID, ONSET_COLUMN.id),
    ).toBe(ONSET_COLUMN.id);
    expect(chooseSelectedColumnId(draft, QUEENS_LAYOUT_ID, undefined)).toBe(
      SEX_COLUMN.id,
    );
    expect(
      chooseSelectedColumnId(
        draft,
        QUEENS_LAYOUT_ID,
        "removed" as CrosswalkColumn.Id,
      ),
    ).toBe(SEX_COLUMN.id);
    expect(chooseSelectedColumnId(draft, REFERENCE_LAYOUT_ID, undefined)).toBe(
      CASE_ID_COLUMN.id,
    );
  });

  it("says whether a layout has a suggestion left", () => {
    expect(hasSuggestions(makeDraft(), QUEENS_LAYOUT_ID)).toBe(true);
    expect(hasSuggestions(makeDraft(), BRONX_LAYOUT_ID)).toBe(false);
  });
});
