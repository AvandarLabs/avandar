import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  GENDER,
  makeApplyLookups,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { PickedEntryDetails } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/PickedEntryDetails";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";

const COPY: ConversionCopy = {
  convertAllTooltip: "all",
  referenceAllTooltip: "all reference",
  convertTooltip: "convert",
  referenceTooltip: "reference",
  convertExplanation: "Your data will change.",
  referenceExplanation: "Your data stays the same.",
  convertUnavailable: undefined,
};
const ROW = {
  column: GENDER,
  profile: {
    values: [
      { value: "1", rowCount: 4 },
      { value: "7", rowCount: 1 },
    ],
  } as ColumnProfile.T,
  matches: [],
};

function _render(pick = SEX_PICK) {
  const dispatch = vi.fn();
  render(
    <PickedEntryDetails
      row={ROW}
      pick={pick}
      lookups={makeApplyLookups()}
      copy={COPY}
      dispatch={dispatch}
    />,
  );
  return dispatch;
}

describe("PickedEntryDetails", () => {
  it("shows what each value becomes, and keeps an unmatched one as is", () => {
    _render();

    expect(
      screen.getByRole("columnheader", { name: "Becomes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1 4 Male/ })).toBeInTheDocument();
    expect(screen.getByText("Not in the list, kept as is")).toBeInTheDocument();
    expect(screen.getByText("Chosen from the data")).toBeInTheDocument();
    expect(screen.getByText("Your data will change.")).toBeInTheDocument();
  });

  it("offers an info icon that defines the two sides beside the direction switch", () => {
    _render();
    expect(
      screen.getByRole("button", {
        name: "What are source and target values?",
      }),
    ).toBeInTheDocument();
  });

  it("switches direction and keeps the original values", () => {
    const dispatch = _render();

    fireEvent.click(screen.getByRole("button", { name: "Target → Source" }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Also keep the original values in a new column, GENDER_original",
      }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "set_direction",
      columnId: GENDER.id,
      direction: "encode",
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_keeps_original",
      columnId: GENDER.id,
      keepsOriginal: true,
    });
  });

  it("hides the conversion controls for a reference column", () => {
    const dispatch = _render({ ...SEX_PICK, mode: "reference" });

    expect(
      screen.getByRole("columnheader", { name: "Means" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Target → Source" }),
    ).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply conversions" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_mode",
      columnId: GENDER.id,
      mode: "convert",
    });
  });
});
