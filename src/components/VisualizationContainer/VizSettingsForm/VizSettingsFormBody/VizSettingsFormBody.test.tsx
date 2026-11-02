import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { VizSettingsFormBody } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import type { UnknownDataFrame } from "@avandar/utils";

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
  onVizConfigChange?: (nextVizConfig: VizConfig) => void;
};

function renderForm({ vizConfig, onVizConfigChange = vi.fn() }: RenderProps): {
  onVizConfigChange: ReturnType<typeof vi.fn>;
  rerenderWith: (nextConfig: VizConfig) => void;
} {
  const vizConfigChangeMock = onVizConfigChange as ReturnType<typeof vi.fn>;
  const result = render(
    <AvandarAppProvider>
      <VizSettingsFormBody
        columns={COLUMNS}
        data={DATA}
        vizConfig={vizConfig}
        onVizConfigChange={vizConfigChangeMock}
      />
    </AvandarAppProvider>,
  );
  return {
    onVizConfigChange: vizConfigChangeMock,
    rerenderWith: (nextConfig) => {
      result.rerender(
        <AvandarAppProvider>
          <VizSettingsFormBody
            columns={COLUMNS}
            data={DATA}
            vizConfig={nextConfig}
            onVizConfigChange={vizConfigChangeMock}
          />
        </AvandarAppProvider>,
      );
    },
  };
}

describe("VizSettingsFormBody: table viz type", () => {
  it("renders no extra controls for the table viz type", () => {
    renderForm({ vizConfig: { vizType: "table" } });
    expect(screen.queryByRole("combobox", { name: /X Axis/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Y Axis/i })).toBeNull();
  });
});

describe("VizSettingsFormBody: bar chart smoke test", () => {
  const baseConfig: VizConfig = {
    vizType: "bar",
    xAxisKey: undefined,
    series: [],
    layout: "group",
    withLegend: true,
  };

  it("picks an X axis column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/X axis/i, "category");
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
  });

  it("renders the legend toggle", () => {
    renderForm({ vizConfig: baseConfig });
    expect(
      screen.getByRole("switch", { name: /Show legend/i }),
    ).toBeInTheDocument();
  });

  it("renders the bar layout segmented control", () => {
    renderForm({ vizConfig: baseConfig });
    expect(screen.getByText(/Grouped/i)).toBeInTheDocument();
  });
});

describe("VizSettingsFormBody: line chart smoke test", () => {
  const baseConfig: VizConfig = {
    vizType: "line",
    xAxisKey: undefined,
    series: [],
    withLegend: false,
  };

  it("picks an X axis column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/X axis/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
  });
});

describe("VizSettingsFormBody: area chart smoke test", () => {
  const baseConfig: VizConfig = {
    vizType: "area",
    xAxisKey: undefined,
    series: [],
    layout: "default",
    withLegend: true,
  };

  it("picks an X axis column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/X axis/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      xAxisKey: "category",
    });
  });
});

describe("VizSettingsFormBody: scatter chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "scatter",
    series: [{ xKey: "value", key: "score" }],
  };

  it("only offers numeric columns for X and Y axis pickers", () => {
    renderForm({ vizConfig: baseConfig });
    const xAxisDropdown = getMantineSelectDropdown(/X column/i);
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

describe("VizSettingsFormBody: pie chart controls", () => {
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

describe("VizSettingsFormBody: funnel chart controls", () => {
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

describe("VizSettingsFormBody: radar chart smoke test", () => {
  const baseConfig: VizConfig = {
    vizType: "radar",
    nameKey: undefined,
    series: [],
    withLegend: true,
  };

  it("picks a category column", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    pickMantineSelectOption(/Category axis/i, "category");
    expect(onVizConfigChange).toHaveBeenLastCalledWith({
      ...baseConfig,
      nameKey: "category",
    });
  });
});

describe("VizSettingsFormBody: bubble chart controls", () => {
  const baseConfig: VizConfig = {
    vizType: "bubble",
    series: [{ xKey: "value", key: "score", sizeKey: "value" }],
  };

  it("renders X, Y, and Size column pickers for each series", () => {
    renderForm({ vizConfig: baseConfig });
    // Use `combobox` role rather than `getByLabelText` because Mantine's
    // Select renders both the input and the listbox dropdown with the same
    // `aria-labelledby` target, so a plain label lookup matches two nodes.
    expect(
      screen.getByRole("combobox", { name: /X column/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Y column/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Size column/i }),
    ).toBeInTheDocument();
  });
});
