/**
 * Behavioural tests for the filter builder. The first one is the regression
 * test for the bug that made the panel unusable: the value input used to be
 * unmounted on every keystroke, so focus jumped to `<body>` and only the first
 * character landed.
 */
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

function _column(name: string, dataType: string): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: `qc_${name}`,
    baseColumn: Model.make("DatasetColumn", {
      id: `dc_${name}`,
      name,
      originalName: name,
      dataType,
      columnIdx: 0,
    }),
    aggregation: undefined,
  }) as unknown as QueryColumnRead;
}

const COLUMNS = [
  _column("Admin2", "varchar"),
  _column("daily_new_cases", "bigint"),
  _column("province_state_administrative_name", "varchar"),
];

const ONE_TEXT_RULE: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    {
      type: "rule",
      id: "r1",
      columnName: "Admin2",
      columnDataType: "varchar",
      operator: "contains",
      value: "",
    },
  ],
};

function _renderField(
  value: QueryFilterGroup,
  onChange = vi.fn<(next: QueryFilterGroup) => void>(),
) {
  render(
    <AvandarAppProvider>
      <QueryFiltersField columns={COLUMNS} value={value} onChange={onChange} />
    </AvandarAppProvider>,
  );
  return onChange;
}

describe("QueryFiltersField", () => {
  it("keeps focus in the value input across several keystrokes", () => {
    _renderField(ONE_TEXT_RULE);
    const input = screen.getByTestId("filter-value-scalar");

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "s" } });
    expect(document.activeElement).toBe(
      screen.getByTestId("filter-value-scalar"),
    );

    fireEvent.change(screen.getByTestId("filter-value-scalar"), {
      target: { value: "sa" },
    });
    fireEvent.change(screen.getByTestId("filter-value-scalar"), {
      target: { value: "san" },
    });

    expect(screen.getByTestId("filter-value-scalar")).toHaveValue("san");
    expect(document.activeElement).toBe(
      screen.getByTestId("filter-value-scalar"),
    );
  });

  it("shows the combinator as And and can switch it to Or", async () => {
    const onChange = _renderField({
      ...ONE_TEXT_RULE,
      rules: [
        ONE_TEXT_RULE.rules[0]!,
        {
          type: "rule",
          id: "r2",
          columnName: "Admin2",
          columnDataType: "varchar",
          operator: "=",
          value: "Butte",
        },
      ],
    });

    const combinator = screen.getByLabelText("Combine conditions with", {
      selector: "input",
    });
    expect(combinator).toHaveValue("And");

    fireEvent.click(combinator);
    fireEvent.click(await screen.findByRole("option", { name: "Or" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const committed = onChange.mock.calls.at(-1)![0];
    expect(committed.combinator).toBe("OR");
  });

  it("offers operators that suit the column type", async () => {
    _renderField({
      type: "group",
      id: "g1",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          id: "r1",
          columnName: "daily_new_cases",
          columnDataType: "bigint",
          operator: ">",
          value: 5,
        },
      ],
    });

    fireEvent.click(screen.getByLabelText("Condition", { selector: "input" }));
    expect(
      await screen.findByRole("option", { name: "is between" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "contains" })).toBeNull();
  });

  it("shows full column names in the column dropdown", async () => {
    _renderField(ONE_TEXT_RULE);
    fireEvent.click(screen.getByLabelText("Column", { selector: "input" }));
    expect(
      await screen.findByRole("option", {
        name: "province_state_administrative_name",
      }),
    ).toBeInTheDocument();
  });

  it("prompts for a data source when there are no columns", () => {
    render(
      <AvandarAppProvider>
        <QueryFiltersField
          columns={[]}
          value={ONE_TEXT_RULE}
          onChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByText(/select a data source/i)).toBeInTheDocument();
  });

  it("explains why a rule is not applied", () => {
    _renderField({
      type: "group",
      id: "g1",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          id: "r1",
          columnName: "daily_new_cases",
          columnDataType: "bigint",
          operator: ">",
          value: "abc",
        },
      ],
    });
    expect(screen.getByText(/"abc" is not a number/)).toBeInTheDocument();
  });
});
