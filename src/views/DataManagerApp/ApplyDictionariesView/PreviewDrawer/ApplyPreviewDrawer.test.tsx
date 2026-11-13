import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  COUNTY,
  GENDER,
  makeApplyFlow,
  makeApplyLookups,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { ApplyPreviewDrawer } from "@/views/DataManagerApp/ApplyDictionariesView/PreviewDrawer/ApplyPreviewDrawer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows")
      >();
    return {
      ...original,
      usePreviewRows: () => {
        return {
          status: "ready",
          result: [
            [
              { raw: "1", converted: "Male" },
              { raw: "Bronx", converted: undefined },
            ],
            [
              { raw: "7", converted: "7" },
              { raw: "Kings", converted: undefined },
            ],
          ],
        };
      },
    };
  },
);

const DATASET = { id: "dataset-1", name: "Bronx line list" } as Dataset.T;

function _render() {
  const onClose = vi.fn();
  render(
    <ApplyPreviewDrawer
      dataset={DATASET}
      columns={[GENDER, COUNTY]}
      flow={makeApplyFlow({
        unmatched: {
          status: "ready",
          result: new Map([
            [GENDER.id, [{ value: "7", valueKey: "7", rowCount: 3 }]],
          ]),
        },
      })}
      lookups={makeApplyLookups()}
      onClose={onClose}
      takesFocusOnOpen
      onFocused={vi.fn()}
    />,
  );
  return onClose;
}

describe("ApplyPreviewDrawer", () => {
  it("shows the first rows with changed values struck through and unmatched ones marked", () => {
    _render();

    const drawer = screen.getByRole("region", { name: "Preview data" });
    expect(drawer).toHaveFocus();
    const [, firstRow, secondRow] = within(drawer).getAllByRole("row");
    expect(firstRow?.querySelector("del")).toHaveTextContent("1");
    expect(firstRow?.querySelector("ins")).toHaveTextContent("Male");
    expect(within(secondRow!).getByText(/not in the list/)).toBeInTheDocument();
  });

  it("shows only the columns this touches when asked", () => {
    _render();

    fireEvent.click(
      screen.getByRole("switch", { name: "Only columns this touches" }),
    );

    expect(
      screen.getByRole("columnheader", { name: "GENDER" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "county" })).toBeNull();
  });

  it("closes on Escape and from its close button", () => {
    const onClose = _render();

    fireEvent.keyDown(screen.getByRole("region", { name: "Preview data" }), {
      key: "Escape",
    });
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
