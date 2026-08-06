import { describe, expect, it } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { render, screen } from "@/test-utils";
import { AvaSqlBlock } from "./AvaSqlBlock";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DATASET_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: DATASET_ID,
      name: "Cases",
      columns: [{ name: "Admin2" }, { name: "count" }],
    },
  ],
};

describe("AvaSqlBlock readOnly", () => {
  it("renders dataset and column names as pills", () => {
    const sql = `SELECT "Admin2", "count" FROM "${DATASET_ID}"`;

    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={catalog}
          readOnly
          data-testid="block"
        />
      </AvandarUiProvider>,
    );

    const root = screen.getByTestId("block");
    expect(root).toBeInTheDocument();
    const datasetPills = root.querySelectorAll(".sqlPill--dataset");
    const columnPills = root.querySelectorAll(".sqlPill--column");
    expect(datasetPills.length).toBe(1);
    expect(datasetPills[0]!.textContent).toBe("Cases");
    expect(columnPills.length).toBeGreaterThanOrEqual(2);
    const labels = Array.from(columnPills).map((p) => {
      return p.textContent;
    });
    expect(labels).toEqual(expect.arrayContaining(["Admin2", "count"]));
  });

  it("renders plain text segments between pills", () => {
    const sql = `SELECT "count" FROM "${DATASET_ID}"`;
    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={catalog}
          readOnly
          data-testid="block"
        />
      </AvandarUiProvider>,
    );

    const root = screen.getByTestId("block");
    expect(root.textContent).toContain("SELECT ");
    expect(root.textContent).toContain(" FROM ");
  });

  it("renders out-of-scope column pills as errors with an inline notice", () => {
    const sql = `SELECT "count" FROM "${DATASET_ID}"`;
    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={catalog}
          readOnly
          outOfScopeColumns={["count"]}
          data-testid="block"
        />
      </AvandarUiProvider>,
    );
    const root = screen.getByTestId("block");
    expect(root.querySelectorAll(".sqlPill--error").length).toBe(1);
    expect(screen.getByTestId("ava-sql-out-of-scope")).toBeInTheDocument();
  });

  it("renders empty SQL without crashing", () => {
    render(
      <AvandarUiProvider>
        <AvaSqlBlock value="" catalog={catalog} readOnly data-testid="block" />
      </AvandarUiProvider>,
    );
    expect(screen.getByTestId("block")).toBeInTheDocument();
  });
});

describe("AvaSqlBlock editable", () => {
  it("renders a CodeMirror editor when onChange is provided", () => {
    const sql = `SELECT "Admin2" FROM "${DATASET_ID}"`;

    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={catalog}
          onChange={() => {}}
          data-testid="block"
        />
      </AvandarUiProvider>,
    );

    const root = screen.getByTestId("block");
    expect(root.querySelector(".cm-content")).not.toBeNull();
  });

  it("renders pills with the editable modifier and a chevron in edit mode", () => {
    const sql = `SELECT "Admin2" FROM "${DATASET_ID}"`;
    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={catalog}
          onChange={() => {}}
          data-testid="block"
        />
      </AvandarUiProvider>,
    );
    const editablePills = document.querySelectorAll(".sqlPill--editable");
    expect(editablePills.length).toBeGreaterThanOrEqual(2);
    const chevrons = document.querySelectorAll(".sqlPill__chevron");
    expect(chevrons.length).toBeGreaterThanOrEqual(2);
  });

  it("surfaces an inline error notice when out-of-scope columns are present", () => {
    const otherDatasetId = "00000000-0000-4000-8000-000000000099" as DatasetId;
    const broadCatalog: SqlDisplayCatalog = {
      datasets: [
        ...catalog.datasets,
        {
          id: otherDatasetId,
          name: "Other",
          columns: [{ name: "order_id" }],
        },
      ],
    };
    const sql = `SELECT "order_id" FROM "${DATASET_ID}"`;
    render(
      <AvandarUiProvider>
        <AvaSqlBlock
          value={sql}
          catalog={broadCatalog}
          onChange={() => {}}
          data-testid="block"
        />
      </AvandarUiProvider>,
    );
    expect(screen.getByTestId("ava-sql-out-of-scope")).toBeInTheDocument();
  });
});
