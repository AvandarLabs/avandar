import type { PluginVizTypeSchema } from "@plugin-manifest/PluginManifest/PluginVizTypeSchema.ts";
import type { z } from "zod";

type IssuePath = ReadonlyArray<string | number>;
type VizType = z.output<typeof PluginVizTypeSchema>;
type VizSetting = VizType["settings"][number];
type VizSettingControl = VizSetting["control"];
type VizSettingValue = NonNullable<VizSetting["default"]>;

/**
 * A problem found in a manifest's `contributes.vizTypes` and where it sits,
 * in the shape the manifest schema needs to report it as a Zod issue.
 */
export type VizTypeIssue = Readonly<{ path: IssuePath; message: string }>;

/** Each value that already appeared earlier in `values`, with its index. */
function _getRepeatedValues(
  values: readonly string[],
): Array<{ index: number; value: string }> {
  return values.flatMap((value, index) => {
    return values.indexOf(value) < index ? [{ index, value }] : [];
  });
}

function _getNumberDefaultMessages(options: {
  control: Extract<VizSettingControl, { kind: "number" }>;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  if (typeof value !== "number") {
    return ["must be a number for a number control"];
  }
  if (control.min !== undefined && value < control.min) {
    return [`must be at least ${control.min}`];
  }
  if (control.max !== undefined && value > control.max) {
    return [`must be at most ${control.max}`];
  }
  return [];
}

function _getOptionDefaultMessages(options: {
  control: Extract<VizSettingControl, { kind: "select" | "segmented" }>;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  const values = control.options.map((option) => {
    return option.value;
  });
  return typeof value === "string" && values.includes(value)
    ? []
    : [`must be one of the option values: ${values.join(", ")}`];
}

/** Why a setting's `default` does not fit its control, if it does not. */
function _getDefaultMessages(options: {
  control: VizSettingControl;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  switch (control.kind) {
    case "columnPicker":
      return ["a column picker cannot have a default"];
    case "select":
    case "segmented":
      return _getOptionDefaultMessages({ control, value });
    case "switch":
      return typeof value === "boolean"
        ? []
        : ["must be true or false for a switch"];
    case "number":
      return _getNumberDefaultMessages({ control, value });
    case "text":
    case "color":
      return typeof value === "string"
        ? []
        : [`must be a string for a ${control.kind} control`];
  }
}

function _getOptionIssues(options: {
  control: VizSettingControl;
  path: IssuePath;
}): VizTypeIssue[] {
  const { control, path } = options;
  if (control.kind !== "select" && control.kind !== "segmented") {
    return [];
  }
  const values = control.options.map((option) => {
    return option.value;
  });
  return _getRepeatedValues(values).map(({ index, value }) => {
    return {
      path: [...path, "control", "options", index, "value"],
      message: `duplicate option value "${value}"`,
    };
  });
}

function _getRangeIssues(options: {
  control: VizSettingControl;
  path: IssuePath;
}): VizTypeIssue[] {
  const { control, path } = options;
  if (
    control.kind !== "number" ||
    control.min === undefined ||
    control.max === undefined ||
    control.min <= control.max
  ) {
    return [];
  }
  return [
    {
      path: [...path, "control", "min"],
      message: `must not be greater than max (${control.max})`,
    },
  ];
}

function _getSettingIssues(options: {
  setting: VizSetting;
  path: IssuePath;
}): VizTypeIssue[] {
  const { setting, path } = options;
  const { control } = setting;
  const defaultIssues =
    setting.default === undefined
      ? []
      : _getDefaultMessages({ control, value: setting.default }).map(
          (message) => {
            return { path: [...path, "default"], message };
          },
        );
  return [
    ..._getOptionIssues({ control, path }),
    ..._getRangeIssues({ control, path }),
    ...defaultIssues,
  ];
}

function _getVizTypeIssues(options: {
  vizType: VizType;
  path: IssuePath;
}): VizTypeIssue[] {
  const { vizType, path } = options;
  const settingsPath = [...path, "settings"];
  const keys = vizType.settings.map((setting) => {
    return setting.key;
  });
  const keyIssues = _getRepeatedValues(keys).map(({ index, value }) => {
    return {
      path: [...settingsPath, index, "key"],
      message: `duplicate setting key "${value}"`,
    };
  });
  const settingIssues = vizType.settings.flatMap((setting, index) => {
    return _getSettingIssues({ setting, path: [...settingsPath, index] });
  });
  return [...keyIssues, ...settingIssues];
}

/**
 * Gets the problems in a manifest's `contributes.vizTypes` that a per-field
 * schema cannot see: repeated chart type ids, setting keys, and option
 * values, a `default` that does not fit its control or sits on a column
 * picker, and a number control whose `min` exceeds its `max`. The manifest
 * schema reports them as Zod issues.
 */
export function getIssuesFromVizTypes(options: {
  vizTypes: readonly VizType[];
  path: IssuePath;
}): VizTypeIssue[] {
  const { vizTypes, path } = options;
  const ids = vizTypes.map((vizType) => {
    return vizType.id;
  });
  const idIssues = _getRepeatedValues(ids).map(({ index, value }) => {
    return {
      path: [...path, index, "id"],
      message: `duplicate viz type id "${value}"`,
    };
  });
  const vizTypeIssues = vizTypes.flatMap((vizType, index) => {
    return _getVizTypeIssues({ vizType, path: [...path, index] });
  });
  return [...idIssues, ...vizTypeIssues];
}
