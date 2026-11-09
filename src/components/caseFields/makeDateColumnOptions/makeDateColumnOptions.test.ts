import { describe, expect, it } from "vitest";
import { makeDateColumnOptions } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";

describe("makeDateColumnOptions", () => {
  it("offers only date and timestamp columns", () => {
    expect(
      makeDateColumnOptions([
        { id: "a", name: "visit_date", dataType: "date" },
        { id: "b", name: "seen_at", dataType: "timestamp" },
        { id: "c", name: "seen_time", dataType: "time" },
        { id: "d", name: "note", dataType: "varchar" },
      ]),
    ).toEqual([
      { value: "a", label: "visit_date" },
      { value: "b", label: "seen_at" },
    ]);
  });
});
