import { useLingui } from "@lingui/react/macro";
import { ColorInput, Group, NumberInput } from "@mantine/core";
import css from "./controls.module.css";
import type { GradientValue } from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const OPAQUE_HEX_COLOR = /^#[0-9a-f]{6}$/i;
const POPOVER = { withinPortal: false } as const;

/** A colour token: a hex field with a picker and the theme's swatches. */
export function ColorValueControl({
  label,
  value,
  onChange,
  swatches = [],
  badge,
}: ValueControlProps &
  Readonly<{ swatches?: readonly string[]; badge?: ReactNode }>) {
  const color = typeof value === "string" ? value : "#000000";
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <ColorInput
        className={css.color}
        size="xs"
        aria-label={label}
        value={color}
        format={color.length === 9 ? "hexa" : "hex"}
        swatches={[...swatches]}
        swatchesPerRow={8}
        withEyeDropper={false}
        popoverProps={POPOVER}
        onChange={(next) => {
          if (HEX_COLOR.test(next)) {
            onChange(next.toLowerCase());
          }
        }}
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
  const { t } = useLingui();
  const shades = Array.isArray(value) ? (value as readonly string[]) : [];
  return (
    <div className={css.palette} role="group" aria-label={label}>
      {shades.map((shade, index) => (
        <ColorInput
          key={`shade-${String(index)}`}
          size="xs"
          aria-label={t`${label}, shade ${index}`}
          value={shade}
          format="hex"
          withEyeDropper={false}
          popoverProps={POPOVER}
          onChange={(next) => {
            if (OPAQUE_HEX_COLOR.test(next)) {
              onChange(
                shades.map((current, position) =>
                  position === index ? next.toLowerCase() : current,
                ),
              );
            }
          }}
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
  const { t } = useLingui();
  const shade =
    typeof value === "number"
      ? { light: value, dark: value }
      : (value as Readonly<{ light: number; dark: number }>);
  const field = (side: "dark" | "light", name: string) => (
    <NumberInput
      size="xs"
      label={name}
      min={0}
      max={9}
      step={1}
      allowDecimal={false}
      value={shade[side]}
      onChange={(next) =>
        typeof next === "number" && onChange({ ...shade, [side]: next })
      }
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label}>
      {field("dark", t`On dark grounds`)}
      {field("light", t`On light grounds`)}
    </Group>
  );
}

/** A gradient token: two colours and an angle. */
export function GradientValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const gradient = value as GradientValue;
  const colorField = (side: "from" | "to", name: string) => (
    <ColorInput
      size="xs"
      label={name}
      value={gradient[side]}
      format="hex"
      withEyeDropper={false}
      popoverProps={POPOVER}
      onChange={(next) => {
        if (HEX_COLOR.test(next)) {
          onChange({ ...gradient, [side]: next.toLowerCase() });
        }
      }}
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label} wrap="nowrap">
      {colorField("from", t`From`)}
      {colorField("to", t`To`)}
      <NumberInput
        size="xs"
        label={t`Angle`}
        suffix="°"
        min={0}
        max={360}
        value={gradient.deg}
        onChange={(deg) =>
          typeof deg === "number" && onChange({ ...gradient, deg })
        }
      />
    </Group>
  );
}
