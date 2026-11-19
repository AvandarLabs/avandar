import { Group } from "@mantine/core";
import { HexColorInput } from "./HexColorInput";
import { RangeNumberInput } from "./RangeNumberInput";
import type { GradientValue } from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

/** A gradient token: two colours and an angle. */
export function GradientValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const gradient = value as GradientValue;
  const colorField = (side: "from" | "to", name: string) => {
    return (
      <HexColorInput
        size="xs"
        label={name}
        value={gradient[side]}
        allowAlpha
        onChange={(color) => {
          return onChange({ ...gradient, [side]: color });
        }}
      />
    );
  };
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
        onChange={(deg) => {
          return onChange({ ...gradient, deg });
        }}
      />
    </Group>
  );
}
