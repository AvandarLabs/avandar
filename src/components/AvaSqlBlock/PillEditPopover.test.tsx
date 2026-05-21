import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { PillEditPopover } from "./PillEditPopover";
import type { SqlPillClickInfo } from "@/lib/sql/createSqlDisplayExtension";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const CASES_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;
const ORDERS_ID = "00000000-0000-4000-8000-000000000002" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: CASES_ID,
      name: "Cases",
      columns: [{ name: "Admin2" }, { name: "count" }],
    },
    {
      id: ORDERS_ID,
      name: "Orders",
      columns: [{ name: "order_id" }, { name: "total" }],
    },
  ],
};

function makeRect(): DOMRect {
  return new DOMRect(10, 20, 50, 18);
}

describe("PillEditPopover", () => {
  it("shows all workspace datasets for a dataset pill", () => {
    const pill: SqlPillClickInfo = {
      kind: "dataset",
      label: "Cases",
      datasetId: CASES_ID,
      start: 14,
      end: 50,
      raw: `"${CASES_ID}"`,
      anchorRect: makeRect(),
    };
    const onSelect = vi.fn();
    render(
      <AvandarUiProvider>
        <PillEditPopover
          pill={pill}
          catalog={catalog}
          sql={`SELECT * FROM "${CASES_ID}"`}
          onClose={() => {}}
          onSelect={onSelect}
        />
      </AvandarUiProvider>,
    );

    expect(screen.getByText("Cases")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("calls onSelect with the replacement insert when a dataset option is picked", () => {
    const pill: SqlPillClickInfo = {
      kind: "dataset",
      label: "Cases",
      datasetId: CASES_ID,
      start: 14,
      end: 50,
      raw: `"${CASES_ID}"`,
      anchorRect: makeRect(),
    };
    const onSelect = vi.fn();
    render(
      <AvandarUiProvider>
        <PillEditPopover
          pill={pill}
          catalog={catalog}
          sql={`SELECT * FROM "${CASES_ID}"`}
          onClose={() => {}}
          onSelect={onSelect}
        />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("Orders"));
    expect(onSelect).toHaveBeenCalledWith({ insert: `"${ORDERS_ID}"` });
  });

  it("scopes column options to columns of in-scope datasets only", () => {
    const pill: SqlPillClickInfo = {
      kind: "column",
      label: "Admin2",
      name: "Admin2",
      start: 7,
      end: 15,
      raw: `"Admin2"`,
      isError: false,
      anchorRect: makeRect(),
    };
    render(
      <AvandarUiProvider>
        <PillEditPopover
          pill={pill}
          catalog={catalog}
          sql={`SELECT "Admin2" FROM "${CASES_ID}"`}
          onClose={() => {}}
          onSelect={() => {}}
        />
      </AvandarUiProvider>,
    );
    // Cases columns are in-scope.
    expect(screen.getByText("Admin2")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
    // Orders columns are not.
    expect(screen.queryByText("order_id")).toBeNull();
    expect(screen.queryByText("total")).toBeNull();
  });

  it("calls onSelect with quoted column name when a column option is picked", () => {
    const pill: SqlPillClickInfo = {
      kind: "column",
      label: "Admin2",
      name: "Admin2",
      start: 7,
      end: 15,
      raw: `"Admin2"`,
      isError: false,
      anchorRect: makeRect(),
    };
    const onSelect = vi.fn();
    render(
      <AvandarUiProvider>
        <PillEditPopover
          pill={pill}
          catalog={catalog}
          sql={`SELECT "Admin2" FROM "${CASES_ID}"`}
          onClose={() => {}}
          onSelect={onSelect}
        />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("count"));
    expect(onSelect).toHaveBeenCalledWith({ insert: `"count"` });
  });

  it("returns null when there is no active pill", () => {
    const { container } = render(
      <AvandarUiProvider>
        <PillEditPopover
          pill={null}
          catalog={catalog}
          sql=""
          onClose={() => {}}
          onSelect={() => {}}
        />
      </AvandarUiProvider>,
    );
    expect(
      container.querySelector("[data-testid='ava-sql-pill-popover-anchor']"),
    ).toBeNull();
  });
});
