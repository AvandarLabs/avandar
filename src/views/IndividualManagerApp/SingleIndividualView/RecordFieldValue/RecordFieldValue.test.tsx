/** A field's value on the record page reads by the field's type. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { RecordFieldValue } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValue";

describe("RecordFieldValue", () => {
  it("shows a date field's value as the day it holds, not as a number", () => {
    render(<RecordFieldValue dataType="date" value={1_709_596_800_000} />);

    expect(screen.getByText("Mar 5, 2024")).toBeInTheDocument();
    expect(screen.queryByText("1,709,596,800,000")).toBeNull();
  });

  it("shows a yes or no field's value in words", () => {
    render(<RecordFieldValue dataType="boolean" value={false} />);

    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("says a field with nothing to show has no value", () => {
    render(<RecordFieldValue dataType="varchar" value={null} />);

    expect(screen.getByText("No value")).toBeInTheDocument();
  });
});
