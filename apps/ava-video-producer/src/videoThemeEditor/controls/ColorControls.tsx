import { Group } from "@mantine/core";
import css from "./controls.module.css";
import { HexColorInput } from "./HexColorInput";
import { RangeNumberInput } from "./RangeNumberInput";
import type { GradientValue } from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

type Shade = Readonly<{ light: number; dark: number }>;

/** A colour token: a hex field with a picker and the theme's swatches. */
export function ColorValueControl({
  label,
  value,
  onChange,
  swatches = [],
  badge,
}: ValueControlProps &
  Readonly<{ swatches?: readonly string[]; badge?: ReactNode }>) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <HexColorInput
        className={css.color}
        size="xs"
        aria-label={label}
        value={typeof value === "string" ? value : "#000000"}
        allowAlpha
        swatches={[...swatches]}
        swatchesPerRow={8}
        onChange={onChange}
      />
      {badge}
    </Group>
  );
}

/** A ten-shade palette, one colour field per shade. */
export function PaletteValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const shades = Array.isArray(value) ? (value as readonly string[]) : [];
  return (
    <div className={css.palette} role="group" aria-label={label}>
      {shades.map((shade, index) => (
        <HexColorInput
          // A shade's position is its identity: the palette always has ten.
          key={`shade-${String(index)}`}
          size="xs"
          aria-label={`${label}, shade ${index}`}
          value={shade}
          allowAlpha={false}
          onChange={(color) =>
            onChange(
              shades.map((current, position) =>
                position === index ? color : current,
              ),
            )
          }
        />
      ))}
    </div>
  );
}

/** The primary shade: one index for dark grounds and one for light grounds. */
export function ShadeValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const shade: Shade =
    typeof value === "number"
      ? { light: value, dark: value }
      : (value as Shade);
  const field = (side: keyof Shade, name: string) => (
    <RangeNumberInput
      size="xs"
      label={name}
      min={0}
      max={9}
      step={1}
      allowDecimal={false}
      value={shade[side]}
      onChange={(next) => onChange({ ...shade, [side]: next })}
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label}>
      {field("dark", "On dark backgrounds")}
      {field("light", "On light backgrounds")}
    </Group>
  );
}

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
