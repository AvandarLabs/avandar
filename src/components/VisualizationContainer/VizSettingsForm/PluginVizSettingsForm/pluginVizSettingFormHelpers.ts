import { match } from "ts-pattern";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PluginVizSettingValue } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  ControlSpec,
  SelectOption,
} from "$/models/vizs/VizSettingDescriptors.types";
import type {
  PluginVizSetting,
  PluginVizSettingControl,
} from "@avandar/plugin-manifest/runtime";

/**
 * A control's new value for one plugin chart setting, and the config and
 * columns it applies to.
 */
type SettingValueChange = {
  config: AvaVizConfig.Plugin;
  setting: PluginVizSetting;
  value: unknown;
  fields: readonly QueryResult.ColumnWithId[];
};

function _localizeOptions(options: {
  choices: ReadonlyArray<Readonly<{ value: string; label: string }>>;
  localize: (value: string) => string;
}): SelectOption[] {
  return options.choices.map((choice) => {
    return { value: choice.value, label: options.localize(choice.label) };
  });
}

function _localizeOptional(options: {
  value: string | undefined;
  localize: (value: string) => string;
}): string | undefined {
  return options.value === undefined
    ? undefined
    : options.localize(options.value);
}

function _getSettingValueFromControlValue(
  value: unknown,
): PluginVizSettingValue | undefined {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

/**
 * Makes the `ControlSpec` the shared `Control` draws for a plugin chart
 * setting, with its manifest strings (option labels, a number's unit, a text
 * input's placeholder) passed through `localize`. A column picker keeps its
 * data type filter.
 */
export function makeControlSpecFromPluginVizSetting(options: {
  setting: PluginVizSetting;
  localize: (value: string) => string;
}): ControlSpec {
  const { setting, localize } = options;
  return match<PluginVizSettingControl, ControlSpec>(setting.control)
    .with({ kind: "select" }, (control) => {
      return {
        kind: "select",
        options: _localizeOptions({ choices: control.options, localize }),
      };
    })
    .with({ kind: "segmented" }, (control) => {
      return {
        kind: "segmented",
        options: _localizeOptions({ choices: control.options, localize }),
      };
    })
    .with({ kind: "number" }, (control) => {
      return {
        ...control,
        unit: _localizeOptional({ value: control.unit, localize }),
      };
    })
    .with({ kind: "text" }, (control) => {
      return {
        kind: "text",
        placeholder: _localizeOptional({
          value: control.placeholder,
          localize,
        }),
      };
    })
    .with(
      { kind: "columnPicker" },
      { kind: "switch" },
      { kind: "color" },
      (control) => {
        return control;
      },
    )
    .exhaustive();
}

/**
 * Makes the plugin chart config that results from a control's new value for
 * one setting. A column picker's value is a column ID, stored in
 * `columnSettings` when it names one of `fields`. Every other setting's value
 * is stored in `settings`. A cleared control stores undefined.
 */
export function makePluginVizConfigFromSettingValue(
  options: Readonly<SettingValueChange>,
): AvaVizConfig.Plugin {
  const { config, setting, value, fields } = options;
  if (setting.control.kind === "columnPicker") {
    const column = fields.find((field) => {
      return field.id === value;
    });
    return {
      ...config,
      columnSettings: { ...config.columnSettings, [setting.key]: column?.id },
    };
  }
  return {
    ...config,
    settings: {
      ...config.settings,
      [setting.key]: _getSettingValueFromControlValue(value),
    },
  };
}
