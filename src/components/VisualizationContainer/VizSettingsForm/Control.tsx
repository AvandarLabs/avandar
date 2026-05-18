import {
  ColorInput,
  NumberInput,
  SegmentedControl,
  Switch,
  TextInput,
} from "@mantine/core";
import { makeSelectOptions, Select } from "@ui";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ControlSpec } from "$/models/vizs/SettingDescriptor";

type Props = {
  /** Display label for the control. */
  label: string;
  /** Specification describing which widget to render. */
  spec: ControlSpec;
  /** Current value of the setting this control edits. */
  value: unknown;
  /** Called with the new value when the user edits the control. */
  onChange: (next: unknown) => void;
  /**
   * Columns available for `columnPicker` controls. Required when
   * `spec.kind === "columnPicker"`; ignored otherwise.
   */
  fields?: readonly QueryResultColumn[];
};

/**
 * Render a single Mantine widget for a {@link ControlSpec}. The form
 * layer renders one of these per {@link SettingDescriptor} it
 * processes.
 */
export function Control({
  label,
  spec,
  value,
  onChange,
  fields = [],
}: Props): JSX.Element {
  switch (spec.kind) {
    case "switch":
      return (
        <Switch
          label={label}
          checked={value === true}
          onChange={(event) => {
            onChange(event.currentTarget.checked);
          }}
        />
      );

    case "color":
      return (
        <ColorInput
          label={label}
          value={typeof value === "string" ? value : ""}
          swatches={[...(spec.swatches ?? CHART_COLOR_SWATCHES)]}
          withEyeDropper={false}
          format="hex"
          onChange={(next) => {
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "segmented":
      return (
        <SegmentedControl
          aria-label={label}
          fullWidth
          data={spec.options.map((o) => {
            return { value: o.value, label: o.label };
          })}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => {
            onChange(next);
          }}
        />
      );

    case "select":
      return (
        <Select
          label={label}
          data={spec.options.map((o) => {
            return { value: o.value, label: o.label };
          })}
          value={typeof value === "string" ? value : null}
          onChange={(next) => {
            onChange(next ?? undefined);
          }}
        />
      );

    case "number":
      return (
        <NumberInput
          label={label}
          value={typeof value === "number" ? value : ""}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          suffix={spec.unit !== undefined ? ` ${spec.unit}` : undefined}
          onChange={(next) => {
            onChange(typeof next === "number" ? next : undefined);
          }}
        />
      );

    case "text":
      return (
        <TextInput
          label={label}
          value={typeof value === "string" ? value : ""}
          placeholder={spec.placeholder}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "columnPicker":
      return (
        <_ColumnPicker
          label={label}
          fields={fields}
          dataType={spec.dataType}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
        />
      );
  }
}

function _ColumnPicker({
  label,
  fields,
  dataType,
  value,
  onChange,
}: {
  label: string;
  fields: readonly QueryResultColumn[];
  dataType: "numeric" | "any" | "temporal" | "text" | undefined;
  value: string | undefined;
  onChange: (next: unknown) => void;
}): JSX.Element {
  const filtered = useMemo(() => {
    if (dataType === undefined || dataType === "any") {
      return fields;
    }
    if (dataType === "numeric") {
      return fields.filter((c) => {
        return AvaDataType.isNumeric(c.dataType);
      });
    }
    if (dataType === "temporal") {
      return fields.filter((c) => {
        return AvaDataType.isTemporal(c.dataType);
      });
    }
    return fields.filter((c) => {
      return AvaDataType.isText(c.dataType);
    });
  }, [fields, dataType]);

  const options = useMemo(() => {
    return makeSelectOptions(filtered, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [filtered]);

  return (
    <Select
      allowDeselect
      label={label}
      data={options}
      value={value ?? null}
      disabled={options.length === 0}
      placeholder={
        options.length === 0 ? "No columns available" : "Select a column"
      }
      onChange={(next) => {
        onChange(next ?? undefined);
      }}
    />
  );
}
