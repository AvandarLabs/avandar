import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { VizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsForm";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
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

describe("VizSettingsForm — top-level type picker", () => {
  it("invokes onVizTypeChange when a new viz type is picked", () => {
    const { onVizTypeChange } = renderForm({ vizConfig: { vizType: "table" } });
    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");
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
    pickMantineSelectOption(/X Axis/i, "category");
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
  });

  it("picks a Y axis from numeric columns only", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/Y Axis/i, "value");
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
    pickMantineSelectOption(/X Axis/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
    pickMantineSelectOption(/Y Axis/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      yAxisKey: "value",
    });
  });

  it("changes the curve style", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/Curve style/i, "Linear (straight)");
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
    pickMantineSelectOption(/X Axis/i, "category");
    pickMantineSelectOption(/Y Axis/i, "value");
    pickMantineSelectOption(/Curve style/i, "Step");
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
    const xAxisDropdown = getMantineSelectDropdown(/X Axis/i);
    expect(
      within(xAxisDropdown).queryByRole("option", {
        name: "category",
        hidden: true,
      }),
    ).toBeNull();
    expect(
      within(xAxisDropdown).getByRole("option", {
        name: "value",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(xAxisDropdown).getByRole("option", {
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
    pickMantineSelectOption(/Name column/i, "category");
    pickMantineSelectOption(/Value column/i, "value");
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
    pickMantineSelectOption(/Label type/i, "Percent");
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
    pickMantineSelectOption(/Name column/i, "category");
    pickMantineSelectOption(/Value column/i, "value");
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
    pickMantineSelectOption(/Category column/i, "category");
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
    pickMantineSelectOption(/X Axis/i, "value");
    pickMantineSelectOption(/Y Axis/i, "score");
    pickMantineSelectOption(/Bubble size/i, "value");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      sizeKey: "value",
    });
  });
});
