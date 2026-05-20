import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
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
      <AvandarUiProvider>
        <SqlEditor
          value={sql}
          onChange={() => {}}
          catalog={catalog}
          readOnly={true}
          data-testid="sql-editor"
        />
      </AvandarUiProvider>,
    );

    expect(screen.getByTestId("sql-editor")).toBeInTheDocument();
    expect(screen.getByText("California cases")).toBeInTheDocument();
  });

  it("renders column names as pills in read-only mode", () => {
    const sql = `SELECT "Admin2" FROM "${DS_ID}"`;
    render(
      <AvandarUiProvider>
        <SqlEditor value={sql} onChange={() => {}} catalog={catalog} readOnly />
      </AvandarUiProvider>,
    );
    expect(screen.getAllByText("Admin2").length).toBeGreaterThan(0);
  });
});
