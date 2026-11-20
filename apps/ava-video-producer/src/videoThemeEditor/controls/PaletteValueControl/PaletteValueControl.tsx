import { HexColorInput } from "../HexColorInput";
import css from "./PaletteValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

function _buildShadeEntries(shades: readonly string[]) {
  return shades.map((shade, shadeSlot) => {
    return {
      key: `shade-${shadeSlot}`,
      shadeSlot,
      shade,
    };
  });
}

/** A ten-shade palette, one colour field per shade. */
export function PaletteValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const shades = Array.isArray(value)
    ? value.filter((entry): entry is string => {
        return typeof entry === "string";
      })
    : [];
  return (
    <div className={css.paletteValueGrid} role="group" aria-label={label}>
      {_buildShadeEntries(shades).map(({ key, shadeSlot, shade }) => {
        return (
          <HexColorInput
            // A shade's slot (0..9) is its Mantine palette identity.
            key={key}
            size="xs"
            aria-label={`${label}, shade ${shadeSlot}`}
            value={shade}
            allowAlpha={false}
            onChange={(color) => {
              return onChange(
                shades.map((current, position) => {
                  return position === shadeSlot ? color : current;
                }),
              );
            }}
          />
        );
      })}
    </div>
  );
}
