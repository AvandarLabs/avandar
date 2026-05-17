import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { VizSettingsForm } from "@/components/Visualization/VizSettingsForm/VizSettingsForm";
import type { UnknownDataFrame } from "@utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "category", dataType: "varchar" },
  { name: "value", dataType: "double" },
  { name: "score", dataType: "bigint" },
];

const DATA: UnknownDataFrame = [
  { category: "Alpha", value: 10, score: 1 },
  { category: "Beta", value: 20, score: 2 },
  { category: "Gamma", value: 30, score: 3 },
];

type RenderProps = {
  vizConfig: VizConfig;
  onVizConfigChange?: (next: VizConfig) => void;
  onVizTypeChange?: (next: VizType) => void;
};

function renderForm({
  vizConfig,
  onVizConfigChange = vi.fn(),
  onVizTypeChange = vi.fn(),
}: RenderProps): {
  onVizConfigChange: ReturnType<typeof vi.fn>;
  onVizTypeChange: ReturnType<typeof vi.fn>;
  rerenderWith: (nextConfig: VizConfig) => void;
} {
  const cfgMock = onVizConfigChange as ReturnType<typeof vi.fn>;
  const typeMock = onVizTypeChange as ReturnType<typeof vi.fn>;
  const result = render(
    <AvandarUiProvider>
      <VizSettingsForm
        columns={COLUMNS}
        data={DATA}
        vizConfig={vizConfig}
        onVizConfigChange={cfgMock}
        onVizTypeChange={typeMock}
      />
    </AvandarUiProvider>,
  );
  return {
    onVizConfigChange: cfgMock,
    onVizTypeChange: typeMock,
    rerenderWith: (nextConfig) => {
      result.rerender(
        <AvandarUiProvider>
          <VizSettingsForm
            columns={COLUMNS}
            data={DATA}
            vizConfig={nextConfig}
            onVizConfigChange={cfgMock}
            onVizTypeChange={typeMock}
          />
        </AvandarUiProvider>,
      );
    },
  };
}

function pickOption(comboboxLabel: RegExp | string, optionLabel: string): void {
  const input = screen.getByRole("combobox", { name: comboboxLabel });
  fireEvent.click(input);
  fireEvent.focus(input);
  // Mantine Select renders dropdowns in a portal, and once another Select has
  // been opened in the same test, multiple closed `mantine-Select-dropdown`
  // nodes linger in the DOM. Scope to the dropdown that's visible (i.e. the
  // one Mantine just opened) by filtering out dropdowns with `display: none`.
  const allDropdowns = Array.from(
    document.querySelectorAll<HTMLElement>(".mantine-Select-dropdown"),
  );
  const visibleDropdown = allDropdowns.find((dropdown) => {
    return dropdown.style.display !== "none";
  });
  if (!visibleDropdown) {
    throw new Error(
      `Could not find a visible dropdown for combobox: ${String(comboboxLabel)}`,
    );
  }
  const option = within(visibleDropdown).getByRole("option", {
    name: optionLabel,
    hidden: true,
  });
  fireEvent.click(option);
}

describe("VizSettingsForm — top-level type picker", () => {
  it("invokes onVizTypeChange when a new viz type is picked", () => {
    const { onVizTypeChange } = renderForm({ vizConfig: { vizType: "table" } });
    pickOption(/Visualization Type/i, "Bar Chart");
    expect(onVizTypeChange).toHaveBeenCalledWith("bar");
  });

  it("renders no extra controls for the table viz type", () => {
    renderForm({ vizConfig: { vizType: "table" } });
    expect(screen.queryByRole("combobox", { name: /X Axis/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Y Axis/i })).toBeNull();
  });
});

describe("VizSettingsForm — bar chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "bar",
    xAxisKey: undefined,
    yAxisKey: undefined,
    withLegend: true,
  };

  it("picks an X axis column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/X Axis/i, "category");
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
  });

  it("picks a Y axis from numeric columns only", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/Y Axis/i, "value");
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      yAxisKey: "value",
    });
  });

  it("toggles the legend switch", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    const toggle = screen.getByRole("switch", { name: /Show legend/i });
    fireEvent.click(toggle);
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      withLegend: false,
    });
  });

  it("edits the series color", () => {
    const { onVizConfigChange } = renderForm({
      vizConfig: { ...baseConfig, yAxisKey: "value" },
    });
    const colorInput = screen.getByLabelText("value");
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      yAxisKey: "value",
      color: "#ff0000",
    });
  });
});

describe("VizSettingsForm — line chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "line",
    xAxisKey: undefined,
    yAxisKey: undefined,
    withLegend: false,
    curveType: "monotone",
  };

  it("picks an X and Y axis", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/X Axis/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
    pickOption(/Y Axis/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      yAxisKey: "value",
    });
  });

  it("changes the curve style", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/Curve style/i, "Linear (straight)");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      curveType: "linear",
    });
  });

  it("toggles the legend switch", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    fireEvent.click(screen.getByRole("switch", { name: /Show legend/i }));
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      withLegend: true,
    });
  });
});

describe("VizSettingsForm — area chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "area",
    xAxisKey: undefined,
    yAxisKey: undefined,
    withLegend: true,
    curveType: "monotone",
  };

  it("picks axes and changes the curve style", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/X Axis/i, "category");
    pickOption(/Y Axis/i, "value");
    pickOption(/Curve style/i, "Step");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      curveType: "step",
    });
  });
});

describe("VizSettingsForm — scatter chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "scatter",
    xAxisKey: undefined,
    yAxisKey: undefined,
  };

  it("only offers numeric columns for axes", () => {
    renderForm({ vizConfig: baseConfig });
    const xInput = screen.getByRole("combobox", { name: /X Axis/i });
    fireEvent.click(xInput);
    fireEvent.focus(xInput);
    const dropdowns = Array.from(
      document.querySelectorAll<HTMLElement>(".mantine-Select-dropdown"),
    );
    const dropdown = dropdowns.find((d) => {
      return d.style.display !== "none";
    });
    expect(dropdown).toBeTruthy();
    expect(
      within(dropdown as HTMLElement).queryByRole("option", {
        name: "category",
        hidden: true,
      }),
    ).toBeNull();
    expect(
      within(dropdown as HTMLElement).getByRole("option", {
        name: "value",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(dropdown as HTMLElement).getByRole("option", {
        name: "score",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });
});

describe("VizSettingsForm — pie chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "pie",
    nameKey: undefined,
    valueKey: undefined,
    isDonut: false,
    withLabels: true,
    labelsType: "value",
  };

  it("picks a name and value column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/Name column/i, "category");
    pickOption(/Value column/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      valueKey: "value",
    });
  });

  it("toggles the donut style", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    fireEvent.click(screen.getByRole("switch", { name: /Donut style/i }));
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      isDonut: true,
    });
  });

  it("toggles whether labels are shown and changes label type", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    fireEvent.click(screen.getByRole("switch", { name: /Show labels/i }));
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      withLabels: false,
    });
    pickOption(/Label type/i, "Percent");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      labelsType: "percent",
    });
  });

  it("renders per-slice color inputs when a name column is chosen", () => {
    renderForm({
      vizConfig: { ...baseConfig, nameKey: "category" },
    });
    expect(screen.getByText("Slice colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Beta")).toBeInTheDocument();
    expect(screen.getByLabelText("Gamma")).toBeInTheDocument();
  });
});

describe("VizSettingsForm — funnel chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "funnel",
    nameKey: undefined,
    valueKey: undefined,
  };

  it("picks a name and value column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/Name column/i, "category");
    pickOption(/Value column/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      valueKey: "value",
    });
  });

  it("renders per-step color inputs when a name column is chosen", () => {
    renderForm({
      vizConfig: { ...baseConfig, nameKey: "category" },
    });
    expect(screen.getByText("Slice colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Beta")).toBeInTheDocument();
    expect(screen.getByLabelText("Gamma")).toBeInTheDocument();
  });
});

describe("VizSettingsForm — radar chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "radar",
    nameKey: undefined,
    valueKey: undefined,
  };

  it("picks a category and value column and edits color", () => {
    const { onVizConfigChange } = renderForm({
      vizConfig: { ...baseConfig, valueKey: "value" },
    });
    pickOption(/Category column/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      valueKey: "value",
      nameKey: "category",
    });
    const colorInput = screen.getByLabelText("value");
    fireEvent.change(colorInput, { target: { value: "#00ff00" } });
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      valueKey: "value",
      color: "#00ff00",
    });
  });
});

describe("VizSettingsForm — bubble chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "bubble",
    xAxisKey: undefined,
    yAxisKey: undefined,
    sizeKey: undefined,
  };

  it("picks X, Y, and size from numeric columns", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickOption(/X Axis/i, "value");
    pickOption(/Y Axis/i, "score");
    pickOption(/Bubble size/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      sizeKey: "value",
    });
  });
});
