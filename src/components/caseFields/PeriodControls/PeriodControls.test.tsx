/**
 * A per-period field needs a period and a date column of its own dataset.
 * These pin what the two pickers offer and what they report.
 */
import { describe, expect, it, vi } from "vitest";
import { PeriodControls } from "@/components/caseFields/PeriodControls/PeriodControls";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";

const DATE_COLUMN_OPTIONS = [
  { value: "col-visit-date", label: "visit_date" },
  { value: "col-lab-date", label: "lab_date" },
];

describe("PeriodControls", () => {
  it("reports the period picked with the date column already chosen", () => {
    const onChange = vi.fn();
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        bucketColumnId="col-visit-date"
        dateColumnOptions={DATE_COLUMN_OPTIONS}
        onChange={onChange}
      />,
    );

    pickMantineSelectOption("Period for Temperature", "Per week");

    expect(onChange).toHaveBeenCalledWith({
      bucketGrain: "week",
      bucketColumnId: "col-visit-date",
    });
  });

  it("reports the date column picked with the period already chosen", () => {
    const onChange = vi.fn();
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="quarter"
        bucketColumnId="col-visit-date"
        dateColumnOptions={DATE_COLUMN_OPTIONS}
        onChange={onChange}
      />,
    );

    pickMantineSelectOption("Date column for Temperature", "lab_date");

    expect(onChange).toHaveBeenCalledWith({
      bucketGrain: "quarter",
      bucketColumnId: "col-lab-date",
    });
  });

  it("says so when the field's dataset has no date column", () => {
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        bucketColumnId={undefined}
        dateColumnOptions={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Date column for Temperature" }),
    ).toHaveAccessibleDescription("This dataset has no date column");
  });

  it("shows each picker's label when asked", () => {
    render(
      <PeriodControls
        fieldName="Temperature"
        bucketGrain="month"
        bucketColumnId="col-visit-date"
        dateColumnOptions={DATE_COLUMN_OPTIONS}
        onChange={vi.fn()}
        withLabels
      />,
    );

    expect(screen.getByText("Period")).toBeInTheDocument();
    expect(screen.getByText("Date column")).toBeInTheDocument();
  });
});
