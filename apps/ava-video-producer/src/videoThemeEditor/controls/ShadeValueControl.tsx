import { Group } from "@mantine/core";
import { RangeNumberInput } from "./RangeNumberInput";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

type Shade = Readonly<{ light: number; dark: number }>;

/** The primary shade: one index for dark grounds and one for light grounds. */
export function ShadeValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const shade: Shade =
    typeof value === "number"
      ? { light: value, dark: value }
      : (value as Shade);
  const field = (side: keyof Shade, name: string) => {
    return (
      <RangeNumberInput
        size="xs"
        label={name}
        min={0}
        max={9}
        step={1}
        allowDecimal={false}
        value={shade[side]}
        onChange={(shadeIndex) => {
          return onChange({ ...shade, [side]: shadeIndex });
        }}
      />
    );
  };
  return (
    <Group gap="xs" role="group" aria-label={label}>
      {field("dark", "On dark backgrounds")}
      {field("light", "On light backgrounds")}
    </Group>
  );
}
