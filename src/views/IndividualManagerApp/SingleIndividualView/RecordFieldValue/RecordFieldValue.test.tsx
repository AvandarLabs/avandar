/**
 * A field's value on the record page reads by the field's type. A field that
 * keeps every value shows each one, and a long list starts collapsed so it
 * does not push the other facts away.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { RecordFieldValue } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue";

const DAILY_CASES = [31, 48, 12, 9, 40, 22, 17];

function _getListItems(fieldName: string): string[] {
  return within(screen.getByRole("list", { name: fieldName }))
    .getAllByRole("listitem")
    .map((item) => {
      return item.textContent ?? "";
    });
}

describe("RecordFieldValue", () => {
  it("shows a single value as text", () => {
    render(
      <RecordFieldValue
        fieldName="County"
        valueShape="single"
        dataType="varchar"
        value="Alameda"
      />,
    );

    expect(screen.getByText("Alameda")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows a date field's value as the day it holds, not as a number", () => {
    render(
      <RecordFieldValue
        fieldName="Rash onset"
        valueShape="single"
        dataType="date"
        value={1_709_596_800_000}
      />,
    );

    expect(screen.getByText("Mar 5, 2024")).toBeInTheDocument();
    expect(screen.queryByText("1,709,596,800,000")).toBeNull();
  });

  it("shows a yes or no field's value in words", () => {
    render(
      <RecordFieldValue
        fieldName="Vaccinated"
        valueShape="single"
        dataType="boolean"
        value={false}
      />,
    );

    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("says a field with nothing to show has no value", () => {
    render(
      <RecordFieldValue
        fieldName="Notes"
        valueShape="single"
        dataType="varchar"
        value={null}
      />,
    );

    expect(screen.getByText("No value")).toBeInTheDocument();
  });

  it("lists each value of a field that keeps every value, in order", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        dataType="bigint"
        value={[31, 48]}
      />,
    );

    expect(_getListItems("Daily new cases")).toEqual(["31", "48"]);
  });

  // A list's dates arrive as `YYYY-MM-DD` text, and read like a single date.
  it("formats each date of a list field as a date", () => {
    render(
      <RecordFieldValue
        fieldName="Visit dates"
        valueShape="list"
        dataType="date"
        value={["2026-01-05", "2026-02-01"]}
      />,
    );

    expect(_getListItems("Visit dates")).toEqual([
      "Jan 5, 2026",
      "Feb 1, 2026",
    ]);
  });

  // A list has no NULL entries on the grid, so none show here either.
  it("leaves out the empty items of a list", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        dataType="bigint"
        value={[31, null, 48]}
      />,
    );

    expect(_getListItems("Daily new cases")).toEqual(["31", "48"]);
  });

  it("says a list whose items are all empty has no value", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        dataType="bigint"
        value={[null, null]}
      />,
    );

    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the first five values of a long list until asked for all", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        dataType="bigint"
        value={DAILY_CASES}
      />,
    );
    expect(_getListItems("Daily new cases")).toEqual([
      "31",
      "48",
      "12",
      "9",
      "40",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Show all 7 values" }));
    expect(_getListItems("Daily new cases")).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(_getListItems("Daily new cases")).toHaveLength(5);
  });

  it("offers no toggle for a list of five or fewer", () => {
    render(
      <RecordFieldValue
        fieldName="Daily new cases"
        valueShape="list"
        dataType="bigint"
        value={DAILY_CASES.slice(0, 5)}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says a list field with no values has no value", () => {
    render(
      <RecordFieldValue
        fieldName="Symptoms"
        valueShape="list"
        dataType="varchar"
        value={[]}
      />,
    );

    expect(screen.getByText("No value")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
