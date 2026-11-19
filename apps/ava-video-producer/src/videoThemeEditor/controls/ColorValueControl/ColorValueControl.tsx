import { Group } from "@mantine/core";
import { HexColorInput } from "../HexColorInput";
import css from "./ColorValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps &
  Readonly<{ swatches?: readonly string[]; badge?: ReactNode }>;

/** A colour token: a hex field with a picker and the theme's swatches. */
export function ColorValueControl({
  label,
  value,
  onChange,
  swatches = [],
  badge,
}: Props): ReactNode {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <HexColorInput
        className={css.colorValueField}
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
