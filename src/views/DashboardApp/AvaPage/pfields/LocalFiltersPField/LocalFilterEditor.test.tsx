/**
 * A local filter puts its column's values into `IN`, `ILIKE`, or `=`, which
 * all fail on a list, so a list column is never offered.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { LocalFilterEditor } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFilterEditor";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

const COUNTY_ID = "qc_county" as QueryColumn.Id;

const COLUMNS: QueryResult.ColumnWithId[] = [
  { id: COUNTY_ID, name: "County", dataType: "varchar" },
  {
    id: "qc_cases" as QueryColumn.Id,
    name: "Daily new cases",
    dataType: "varchar",
    isArray: true,
  },
];

describe("LocalFilterEditor", () => {
  it("offers no list column to filter on", async () => {
    render(
      <LocalFilterEditor
        columns={COLUMNS}
        filter={{
          id: "filter_1",
          label: "",
          columnId: COUNTY_ID,
          mode: "select_single",
          optionsRaw: "",
          defaultValue: "",
        }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Column", { selector: "input" }));

    expect(
      await screen.findByRole("option", { name: "County", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Daily new cases", hidden: true }),
    ).toBeNull();
  });
});
