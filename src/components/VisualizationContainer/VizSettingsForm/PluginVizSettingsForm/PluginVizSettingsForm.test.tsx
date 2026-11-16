import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginVizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});

const EPIDEMIOLOGY_ID = "avandar.epidemiology";
const ONSET_ID = "onset-id" as QueryColumn.Id;

const FIELDS: readonly QueryResult.ColumnWithId[] = [
  { id: ONSET_ID, name: "onset", dataType: "date" },
  { id: "cases-id" as QueryColumn.Id, name: "cases", dataType: "bigint" },
  { id: "region-id" as QueryColumn.Id, name: "region", dataType: "varchar" },
];

const CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: EPIDEMIOLOGY_ID,
  pluginVizId: "epicurve",
  columnSettings: {},
  settings: { interval: "day", window: 7 },
};

const MANIFEST_MODULE = {
  manifest: {
    id: EPIDEMIOLOGY_ID,
    contributes: {
      vizTypes: [
        {
          id: "epicurve",
          title: "%viz.title%",
          icon: "chart-histogram",
          render: "transform",
          settings: [
            {
              key: "dateColumn",
              label: "%viz.dateColumn%",
              control: { kind: "columnPicker", dataType: "temporal" },
              required: true,
            },
            {
              key: "interval",
              label: "%viz.interval%",
              control: {
                kind: "segmented",
                options: [
                  { value: "day", label: "%viz.interval.day%" },
                  { value: "month", label: "%viz.interval.month%" },
                ],
              },
              required: false,
              default: "day",
            },
            {
              key: "palette",
              label: "%viz.palette%",
              control: {
                kind: "select",
                options: [{ value: "warm", label: "%viz.palette.warm%" }],
              },
              required: false,
            },
            {
              key: "showTotals",
              label: "%viz.showTotals%",
              control: { kind: "switch" },
              required: false,
            },
            {
              key: "window",
              label: "%viz.window%",
              control: {
                kind: "number",
                min: 1,
                max: 30,
                unit: "%viz.window.unit%",
              },
              required: false,
            },
            {
              key: "note",
              label: "%viz.note%",
              control: { kind: "text", placeholder: "%viz.note.placeholder%" },
              required: false,
            },
            {
              key: "barColor",
              label: "%viz.barColor%",
              control: { kind: "color" },
              required: false,
            },
          ],
        },
      ],
    },
  },
  strings: {
    en: {
      "viz.title": "Epicurve",
      "viz.dateColumn": "Date column",
      "viz.interval": "Interval",
      "viz.interval.day": "Day",
      "viz.interval.month": "Month",
      "viz.palette": "Palette",
      "viz.palette.warm": "Warm",
      "viz.showTotals": "Show totals",
      "viz.window": "Window",
      "viz.window.unit": "days",
      "viz.note": "Note",
      "viz.note.placeholder": "Add a note",
      "viz.barColor": "Bar color",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderForm(
  config: AvaVizConfig.Plugin = CONFIG,
): ReturnType<typeof vi.fn> {
  const onConfigChange = vi.fn();
  render(
    <PluginVizSettingsForm
      fields={FIELDS}
      config={config}
      onConfigChange={onConfigChange}
    />,
    { wrapper: QueryWrapper },
  );
  return onConfigChange;
}

describe("PluginVizSettingsForm", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [
      {
        id: EPIDEMIOLOGY_ID,
        loadManifest: () => {
          return Promise.resolve(MANIFEST_MODULE);
        },
      },
    ];
  });

  it("labels a column picker with the setting's localized label", async () => {
    _renderForm();

    expect(
      await screen.findByRole("combobox", { name: "Date column" }),
    ).toBeInTheDocument();
  });

  it("lists only temporal columns in a temporal column picker", async () => {
    _renderForm();

    // Mantine mounts a select's options only once its dropdown opens.
    fireEvent.click(
      await screen.findByRole("combobox", { name: "Date column" }),
    );

    expect(
      screen.getByRole("option", { name: "onset", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "cases", hidden: true }),
    ).toBeNull();
  });

  it("writes a picked column to columnSettings by its column ID", async () => {
    const onConfigChange = _renderForm();
    await screen.findByRole("combobox", { name: "Date column" });

    pickMantineSelectOption("Date column", "onset");

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      columnSettings: { dateColumn: ONSET_ID },
    });
  });

  it("shows a segmented control's localized option labels", async () => {
    _renderForm();

    expect(
      await screen.findByRole("radio", { name: "Month" }),
    ).toBeInTheDocument();
  });

  it("captions a segmented control with its localized label", async () => {
    _renderForm();

    expect(await screen.findByText("Interval")).toBeVisible();
  });

  it("writes a segmented choice to settings", async () => {
    const onConfigChange = _renderForm();

    fireEvent.click(await screen.findByRole("radio", { name: "Month" }));

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      settings: { ...CONFIG.settings, interval: "month" },
    });
  });

  it("lists a select's localized option labels", async () => {
    _renderForm();

    fireEvent.click(await screen.findByRole("combobox", { name: "Palette" }));

    expect(
      screen.getByRole("option", { name: "Warm", hidden: true }),
    ).toBeInTheDocument();
  });

  it("writes a switch toggle to settings", async () => {
    const onConfigChange = _renderForm();

    fireEvent.click(await screen.findByRole("switch", { name: "Show totals" }));

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      settings: { ...CONFIG.settings, showTotals: true },
    });
  });

  it("shows a number input's value with its localized unit", async () => {
    _renderForm();

    expect(await screen.findByLabelText("Window")).toHaveValue("7 days");
  });

  it("shows a text input's localized placeholder", async () => {
    _renderForm();

    expect(
      await screen.findByPlaceholderText("Add a note"),
    ).toBeInTheDocument();
  });

  it("labels a color input with the setting's localized label", async () => {
    _renderForm();

    expect(await screen.findByLabelText("Bar color")).toBeInTheDocument();
  });

  it("shows a loading status while the manifest loads", () => {
    mocks.entries = [
      {
        id: "avandar.pending",
        loadManifest: () => {
          return new Promise(() => {});
        },
      },
    ];
    _renderForm({ ...CONFIG, pluginId: "avandar.pending" });

    expect(
      screen.getByRole("status", { name: "Loading chart settings" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["settings is not a record", { settings: "broken" }],
    ["columnSettings is missing", { columnSettings: undefined }],
    [
      "a column setting names no column of the result",
      { columnSettings: { dateColumn: "dropped-id" } },
    ],
    [
      "a segmented value is not one of its options",
      { settings: { interval: "fortnight" } },
    ],
    [
      "a select value is not one of its options",
      { settings: { palette: "cold" } },
    ],
    ["a switch value is not a boolean", { settings: { showTotals: "yes" } }],
    ["a number value is not a number", { settings: { window: "7" } }],
    ["a text value is not a string", { settings: { note: 5 } }],
    ["a color value is not a string", { settings: { barColor: true } }],
  ])(
    "shows that the settings can't be read instead of the controls when %s",
    async (_label, overrides) => {
      _renderForm({
        ...CONFIG,
        ...overrides,
      } as unknown as AvaVizConfig.Plugin);

      expect(
        await screen.findByText("These chart settings can't be read."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Date column" }),
      ).not.toBeInTheDocument();
    },
  );

  it("draws the controls for a column setting while the result has no columns to check it against", async () => {
    const onConfigChange = vi.fn();
    render(
      <PluginVizSettingsForm
        fields={[]}
        config={{ ...CONFIG, columnSettings: { dateColumn: ONSET_ID } }}
        onConfigChange={onConfigChange}
      />,
      { wrapper: QueryWrapper },
    );

    expect(
      await screen.findByRole("combobox", { name: "Date column" }),
    ).toBeInTheDocument();
  });

  it("resets unreadable settings to the defaults a new pick of the chart type gets", async () => {
    const onConfigChange = _renderForm({
      ...CONFIG,
      settings: { interval: "fortnight" },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Reset chart settings" }),
    );

    expect(onConfigChange).toHaveBeenCalledWith({
      vizType: "plugin",
      pluginId: EPIDEMIOLOGY_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: ONSET_ID },
      settings: { interval: "day" },
    });
  });

  it("says the settings are unavailable when the plugin is not bundled", async () => {
    _renderForm({ ...CONFIG, pluginId: "avandar.removed" });

    expect(
      await screen.findByText(
        "The plugin behind this chart is not available, so its settings cannot be shown.",
      ),
    ).toBeInTheDocument();
  });
});
