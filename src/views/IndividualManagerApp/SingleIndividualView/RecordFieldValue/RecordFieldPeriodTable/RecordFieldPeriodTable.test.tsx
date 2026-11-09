/**
 * A per-period field reads as a short table of its most recent periods, with
 * every period one step away, so a long history never pushes the record's
 * other facts out of the rail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { RecordFieldPeriodTable } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** Eight months of averages, January to August 2026. */
const EIGHT_MONTHS: ConceptAttribute.BucketedListEntry[] = [
  38.5, 37.9, 38.1, 38.0, 37.6, 37.4, 37.8, 38.456,
].map((value, index) => {
  return { bucket: `2026-0${index + 1}-01`, value };
});

/** The text of each body row, period then value. */
function _readRows(table: HTMLElement): string[][] {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => {
      return Array.from(row.querySelectorAll("th, td"), (cell) => {
        return cell.textContent ?? "";
      });
    });
}

describe("RecordFieldPeriodTable", () => {
  const originalTimezone = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = originalTimezone;
  });

  it("lists each month with its value under a caption naming the field and period", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS.slice(0, 2)}
      />,
    );

    const table = screen.getByRole("table", { name: "Temperature per month" });
    expect(
      within(table).getByRole("columnheader", { name: "Month" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Value" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "Jan 2026" }),
    ).toBeInTheDocument();
    expect(_readRows(table)).toEqual([
      ["Jan 2026", "38.5"],
      ["Feb 2026", "37.9"],
    ]);
  });

  it("shows the six most recent months, oldest first, and offers the rest", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS}
      />,
    );

    const rows = _readRows(screen.getByRole("table"));
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual(["Mar 2026", "38.1"]);
    expect(rows[5]).toEqual(["Aug 2026", "38.46"]);
    expect(
      screen.getByRole("button", { name: "Show all 8 months" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("opens every month when asked, and folds them back", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show all 8 months" }));

    const toggle = screen.getByRole("button", { name: "Show fewer" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute(
      "aria-controls",
      screen.getByRole("table").id,
    );
    expect(_readRows(screen.getByRole("table"))).toHaveLength(8);

    fireEvent.click(toggle);

    expect(_readRows(screen.getByRole("table"))).toHaveLength(6);
  });

  it("offers nothing more when every month already shows", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={EIGHT_MONTHS.slice(0, 6)}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names the period in the offer for each period length", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Cases"
        bucketGrain="week"
        valueDataType="bigint"
        entries={EIGHT_MONTHS}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Show all 8 weeks" }),
    ).toBeInTheDocument();
  });

  it("says so when the field has no values", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Temperature"
        bucketGrain="month"
        valueDataType="double"
        entries={[]}
      />,
    );

    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // A DATE value arrives as UTC midnight, like the period itself.
  it("shows a date value as the day it holds, whatever the reader's zone", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="First visit"
        bucketGrain="week"
        valueDataType="date"
        entries={[{ bucket: "2026-01-05", value: Date.UTC(2026, 0, 7) }]}
      />,
    );

    expect(_readRows(screen.getByRole("table"))).toEqual([
      ["Week of Jan 5, 2026", "Jan 7, 2026"],
    ]);
  });

  // A TIME value arrives as microseconds since midnight.
  it("shows a time value as a time of day", () => {
    render(
      <RecordFieldPeriodTable
        fieldName="Usual visit time"
        bucketGrain="month"
        valueDataType="time"
        entries={[{ bucket: "2026-01-01", value: 52_200_000_000 }]}
      />,
    );

    expect(_readRows(screen.getByRole("table"))).toEqual([
      ["Jan 2026", "2:30 PM"],
    ]);
  });
});
