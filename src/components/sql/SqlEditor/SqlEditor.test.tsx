import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

import { describe, expect, it } from "vitest";

import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";

import { SqlEditor } from "./SqlEditor";

const DS_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: DS_ID,
      name: "California cases",
      columns: [{ name: "Admin2" }],
    },
  ],
};

describe("SqlEditor", () => {
  it("renders dataset names as pills while keeping ids in the document", () => {
    const sql = `SELECT * FROM "${DS_ID}"`;
    render(
      <AvandarAppProvider>
        <SqlEditor
          value={sql}
          onChange={() => {}}
          catalog={catalog}
          readOnly={true}
          data-testid="sql-editor"
        />
      </AvandarAppProvider>,
    );

    expect(screen.getByTestId("sql-editor")).toBeInTheDocument();
    expect(screen.getByText("California cases")).toBeInTheDocument();
  });

  it("renders column names as pills in read-only mode", () => {
    const sql = `SELECT "Admin2" FROM "${DS_ID}"`;
    render(
      <AvandarAppProvider>
        <SqlEditor value={sql} onChange={() => {}} catalog={catalog} readOnly />
      </AvandarAppProvider>,
    );
    expect(screen.getAllByText("Admin2").length).toBeGreaterThan(0);
  });
});
