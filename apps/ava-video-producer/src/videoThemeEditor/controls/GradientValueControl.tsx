import { Group } from "@mantine/core";
import { HexColorInput } from "./HexColorInput";
import { RangeNumberInput } from "./RangeNumberInput";
import type { GradientValue } from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";

/** A gradient token: two colours and an angle. */
export function GradientValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const gradient = value as GradientValue;
  const colorField = (side: "from" | "to", name: string) => (
    <HexColorInput
      size="xs"
      label={name}
      value={gradient[side]}
      allowAlpha
      onChange={(color) => onChange({ ...gradient, [side]: color })}
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label} wrap="nowrap">
      {colorField("from", "From")}
      {colorField("to", "To")}
      <RangeNumberInput
        size="xs"
        label="Angle"
        suffix="°"
        min={0}
        max={360}
        value={gradient.deg}
        onChange={(deg) => onChange({ ...gradient, deg })}
      />
    </Group>
  );
}
