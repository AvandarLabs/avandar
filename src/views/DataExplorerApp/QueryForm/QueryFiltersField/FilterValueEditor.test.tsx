import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { fireEvent, render, screen } from "@/test-utils";
import { FilterValueEditor } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";
import type { FilterValueEditorProps } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";

function _renderEditor(overrides: Partial<FilterValueEditorProps> = {}) {
  const props: FilterValueEditorProps = {
    operator: "=",
    dataType: "varchar",
    value: "",
    onChange: vi.fn(),
    onCommit: vi.fn(),
    ...overrides,
  };
  render(
    <AvandarAppProvider>
      <FilterValueEditor {...props} />
    </AvandarAppProvider>,
  );
  return props;
}

describe("FilterValueEditor", () => {
  it("renders nothing for operators that take no value", () => {
    _renderEditor({ operator: "is_null" });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders a text box for text columns and reports each change", () => {
    const props = _renderEditor({ value: "Ala" });
    const input = screen.getByTestId("filter-value-scalar");
    fireEvent.change(input, { target: { value: "Alam" } });
    expect(props.onChange).toHaveBeenCalledWith("Alam");
  });

  it("renders a numeric input for numeric columns", () => {
    _renderEditor({ dataType: "bigint", operator: ">", value: 5 });
    expect(screen.getByTestId("filter-value-scalar")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
  });

  it("renders a date input for date columns", () => {
    _renderEditor({ dataType: "date", operator: ">", value: "2020-05-01" });
    expect(screen.getByTestId("filter-value-date")).toHaveAttribute(
      "type",
      "date",
    );
  });

  it("renders two bounds with a separator for between", () => {
    _renderEditor({
      dataType: "bigint",
      operator: "between",
      value: [100, 200],
    });
    expect(screen.getByTestId("filter-value-lower")).toBeInTheDocument();
    expect(screen.getByTestId("filter-value-upper")).toBeInTheDocument();
    expect(screen.getByText("and")).toBeInTheDocument();
  });

  it("reports a pair edit as an array", () => {
    const props = _renderEditor({
      dataType: "bigint",
      operator: "between",
      value: [100, 200],
    });
    fireEvent.change(screen.getByTestId("filter-value-upper"), {
      target: { value: "300" },
    });
    expect(props.onChange).toHaveBeenCalledWith([100, "300"]);
  });

  it("renders a chip list for list operators", () => {
    _renderEditor({ operator: "in", value: ["Alameda", "Butte"] });
    expect(screen.getByText("Alameda")).toBeInTheDocument();
    expect(screen.getByText("Butte")).toBeInTheDocument();
  });

  it("commits on blur so a debounce cannot swallow the last edit", () => {
    const props = _renderEditor({ value: "Alameda" });
    fireEvent.blur(screen.getByTestId("filter-value-scalar"));
    expect(props.onCommit).toHaveBeenCalled();
  });
});
