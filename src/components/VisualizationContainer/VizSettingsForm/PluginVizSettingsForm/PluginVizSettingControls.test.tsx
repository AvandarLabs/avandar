import { describe, expect, it, vi } from "vitest";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
import { render, screen } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSetting } from "@avandar/plugin-manifest/runtime";

// The real control coerces a value of the wrong type to an empty one, so this
// stand-in exposes exactly what `PluginVizSettingControls` passes it.
vi.mock(
  "@/components/VisualizationContainer/VizSettingsForm/Control/Control",
  () => {
    return {
      Control: (props: { label: string; value: unknown }) => {
        return (
          <div
            data-testid={`control-${props.label}`}
            data-value-type={typeof props.value}
          />
        );
      },
    };
  },
);

const SETTINGS = [
  {
    key: "toString",
    label: "Inherited text",
    control: { kind: "text" },
    required: false,
  },
  {
    key: "valueOf",
    label: "Inherited column",
    control: { kind: "columnPicker", dataType: "text" },
    required: false,
  },
  {
    key: "constructor",
    label: "Stored text",
    control: { kind: "text" },
    required: false,
  },
] as unknown as readonly PluginVizSetting[];

const MANIFEST_MODULE = {
  manifest: {},
  strings: { en: {} },
  icons: {},
} as unknown as PluginManifestModule;

const CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: {},
  // `constructor` is a key some object literals reject, so build the stored
  // value with `Object.fromEntries`.
  settings: Object.fromEntries([["constructor", "stored"]]),
};

function _renderControls(config: AvaVizConfig.Plugin): void {
  render(
    <PluginVizSettingControls
      fields={[
        {
          id: "region-id" as QueryColumn.Id,
          name: "region",
          dataType: "varchar",
        },
      ]}
      config={config}
      manifestModule={MANIFEST_MODULE}
      settings={SETTINGS}
      onConfigChange={() => {}}
    />,
  );
}

describe("PluginVizSettingControls", () => {
  it("gives a setting keyed like an Object member no value when none is stored", () => {
    _renderControls(CONFIG);

    expect(screen.getByTestId("control-Inherited text")).toHaveAttribute(
      "data-value-type",
      "undefined",
    );
  });

  it("gives a column setting keyed like an Object member no value when none is stored", () => {
    _renderControls(CONFIG);

    expect(screen.getByTestId("control-Inherited column")).toHaveAttribute(
      "data-value-type",
      "undefined",
    );
  });

  it("still gives a stored value under a key named like an Object member", () => {
    _renderControls(CONFIG);

    expect(screen.getByTestId("control-Stored text")).toHaveAttribute(
      "data-value-type",
      "string",
    );
  });
});
