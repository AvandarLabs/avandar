import { match } from "ts-pattern";
import { AvaPluginVizConfigSchema } from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas";
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

function _isStoredSettingReadable(options: {
  setting: PluginVizSetting;
  config: AvaVizConfig.Plugin;
  fieldIds: ReadonlySet<string>;
}): boolean {
  const { setting, config, fieldIds } = options;
  if (setting.control.kind === "columnPicker") {
    const columnId = config.columnSettings[setting.key];
    // While the result's columns load, `fieldIds` is empty and a stored
    // column cannot be checked yet.
    return (
      columnId === undefined || fieldIds.size === 0 || fieldIds.has(columnId)
    );
  }
  const value = config.settings[setting.key];
  if (value === undefined) {
    return true;
  }
  return match(setting.control)
    .with({ kind: "select" }, { kind: "segmented" }, (control) => {
      return control.options.some((option) => {
        return option.value === value;
      });
    })
    .with({ kind: "switch" }, () => {
      return typeof value === "boolean";
    })
    .with({ kind: "number" }, () => {
      return typeof value === "number" && Number.isFinite(value);
    })
    .with({ kind: "text" }, { kind: "color" }, () => {
      return typeof value === "string";
    })
    .exhaustive();
}

/**
 * Whether a stored plugin chart config can be drawn as the settings form for
 * `settings`: it parses as an `AvaPluginVizConfig`, every column setting
 * names one of `fields`, and every other setting holds a value its control
 * can show. Use it before drawing controls from a config that came from
 * storage, for example a dashboard saved by an older build or edited by hand.
 */
export function isPluginVizConfigReadable(options: {
  config: unknown;
  settings: readonly PluginVizSetting[];
  fields: readonly QueryResult.ColumnWithId[];
}): boolean {
  const result = AvaPluginVizConfigSchema.safeParse(options.config);
  if (!result.success) {
    return false;
  }
  const fieldIds = new Set<string>(
    options.fields.map((field) => {
      return field.id;
    }),
  );
  return options.settings.every((setting) => {
    return _isStoredSettingReadable({ setting, config: result.data, fieldIds });
  });
}
