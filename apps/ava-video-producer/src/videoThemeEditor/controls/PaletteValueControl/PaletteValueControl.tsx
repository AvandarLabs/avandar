import { HexColorInput } from "../HexColorInput";
import css from "./PaletteValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

/** A ten-shade palette, one colour field per shade. */
export function PaletteValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const shades = Array.isArray(value) ? value : [];
  return (
    <div className={css.paletteValueGrid} role="group" aria-label={label}>
      {shades.map((shade, index) => {
        return (
          <HexColorInput
            // A shade's position is its identity: the palette always has ten.
            key={`shade-${String(index)}`}
            size="xs"
            aria-label={`${label}, shade ${index}`}
            value={shade}
            allowAlpha={false}
            onChange={(color) => {
              return onChange(
                shades.map((current, position) => {
                  return position === index ? color : current;
                }),
              );
            }}
          />
        );
      })}
    </div>
  );
}
