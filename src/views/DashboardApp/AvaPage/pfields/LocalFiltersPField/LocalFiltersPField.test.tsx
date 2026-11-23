/**
 * A local filter puts its column's values into `IN`, `ILIKE`, or `=`, which
 * all fail on a list, so a list column is never offered, and the "Add filter"
 * button works only when some column can be filtered on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { fireEvent, render, screen } from "@/test-utils";
import { useDataVizAuthoring } from "@/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring";
import { LocalFiltersPField } from "./LocalFiltersPField";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

vi.mock(
  "@/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring",
  () => {
    return { useDataVizAuthoring: vi.fn() };
  },
);

const COUNTY: QueryResult.ColumnWithId = {
  id: "qc_county" as QueryColumn.Id,
  name: "County",
  dataType: "varchar",
};
const CASES_LIST: QueryResult.ColumnWithId = {
  id: "qc_cases" as QueryColumn.Id,
  name: "Daily new cases",
  dataType: "varchar",
  isArray: true,
};

const update = vi.fn();

function _renderField(
  options: Readonly<{
    columns: QueryResult.ColumnWithId[];
    localFilters?: LocalFilter[];
  }>,
): void {
  // The field reads only these four members of the authoring object.
  vi.mocked(useDataVizAuthoring).mockReturnValue({
    props: { columnBindingVersion: 1, localFilters: [] },
    runtime: { localFilters: options.localFilters ?? [] },
    schema: { columns: options.columns },
    update,
  } as unknown as ReturnType<typeof useDataVizAuthoring>);
  render(
    <LocalFiltersPField
      auth={{ auth: "workspace", workspaceId: uuid<Workspace.Id>() }}
    />,
  );
}

beforeEach(() => {
  update.mockReset();
});

describe("LocalFiltersPField", () => {
  it("offers no list column to filter on", async () => {
    _renderField({
      columns: [COUNTY, CASES_LIST],
      localFilters: [
        {
          id: "filter_1",
          label: "",
          columnId: COUNTY.id,
          mode: "select_single",
          optionsRaw: "",
          defaultValue: "",
        },
      ],
    });
    fireEvent.click(screen.getByLabelText("Column", { selector: "input" }));

    expect(
      await screen.findByRole("option", { name: "County", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Daily new cases", hidden: true }),
    ).toBeNull();
  });

  it("starts a new filter on the first column that is not a list", () => {
    _renderField({ columns: [CASES_LIST, COUNTY] });

    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));

    expect(update.mock.calls[0]![0].localFilters[0].columnId).toBe(COUNTY.id);
  });

  it("disables Add filter when every column is a list", () => {
    _renderField({ columns: [CASES_LIST] });

    expect(screen.getByRole("button", { name: "Add filter" })).toBeDisabled();
  });
});
