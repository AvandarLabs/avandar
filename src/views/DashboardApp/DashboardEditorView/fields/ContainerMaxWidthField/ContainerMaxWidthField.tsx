import { Group, NumberInput, Stack } from "@mantine/core";
import { FieldLabel } from "@puckeditor/core";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { DashboardFieldProps } from "../../DashboardPuck.types";

export type ContainerMaxWidthUnit = "%" | "px";

export type ContainerMaxWidthValue = {
  unit: ContainerMaxWidthUnit;
  value: number;
};

type Props = DashboardFieldProps<ContainerMaxWidthValue>;

const DEFAULT_PERCENT_VALUE = 100;
const DEFAULT_PX_VALUE = 860;

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function _normalizeContainerMaxWidth(value: unknown): ContainerMaxWidthValue {
  if (_isRecord(value)) {
    const unit: unknown = value.unit;
    const rawValue: unknown = value.value;

    const normalizedUnit: ContainerMaxWidthUnit =
      unit === "px" || unit === "%" ? unit : "%";

    const defaultValue: number =
      normalizedUnit === "px" ? DEFAULT_PX_VALUE : DEFAULT_PERCENT_VALUE;

    const normalizedValue: number =
      typeof rawValue === "number" && Number.isFinite(rawValue) ?
        Math.round(rawValue)
      : defaultValue;

    return { unit: normalizedUnit, value: normalizedValue };
  }

  return { unit: "%", value: DEFAULT_PERCENT_VALUE };
}

function _clampValue(options: {
  unit: ContainerMaxWidthUnit;
  value: number;
}): number {
  // Keep the previous behavior for % (20..100). Pixels are unconstrained
  // aside from being non-negative and integer.
  if (options.unit === "%") {
    if (options.value < 20) {
      return 20;
    }
    if (options.value > 100) {
      return 100;
    }
  }

  if (options.value < 0) {
    return 0;
  }

  return Math.round(options.value);
}

/**
 * A custom field that allows the user to set the maximum width of a container.
 * It provides an editable text input and a toggle button to switch between
 * percentage and pixel units.
 */
export function ContainerMaxWidthField({
  value,
  onChange,
  readOnly,
}: Props): JSX.Element {
  const normalized = _normalizeContainerMaxWidth(value);

  const onUnitChange = (nextUnit: ContainerMaxWidthUnit): void => {
    if (readOnly === true) {
      return;
    }

    onChange({
      unit: nextUnit,
      value: nextUnit === "px" ? DEFAULT_PX_VALUE : DEFAULT_PERCENT_VALUE,
    });
  };

  const onValueChange = (nextValue: string | number): void => {
    if (readOnly === true) {
      return;
    }

    if (typeof nextValue !== "number" || !Number.isFinite(nextValue)) {
      return;
    }

    onChange({
      unit: normalized.unit,
      value: _clampValue({ unit: normalized.unit, value: nextValue }),
    });
  };

  return (
    <Stack gap={0}>
      <FieldLabel label="Container max width" />
      <Group gap={6} wrap="nowrap">
        <NumberInput
          value={normalized.value}
          onChange={onValueChange}
          step={1}
          size="xs"
          disabled={readOnly === true}
          styles={{
            input: {
              width: 72, // ~4-5 characters
            },
          }}
        />
        <SegmentedControl<ContainerMaxWidthUnit>
          size="xs"
          value={normalized.unit}
          onChange={onUnitChange}
          data={[
            { value: "%", label: "%" },
            { value: "px", label: "px" },
          ]}
          disabled={readOnly === true}
        />
      </Group>
    </Stack>
  );
}
