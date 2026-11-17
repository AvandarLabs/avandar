import { HexColorInput } from "../HexColorInput";
import css from "./PaletteValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";

function _buildShadeEntries(shades: readonly string[]) {
  return shades.map((shade, shadeSlot) => ({
    key: `shade-${shadeSlot}`,
    shadeSlot,
    shade,
  }));
}

/** A ten-shade palette, one colour field per shade. */
export function PaletteValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const shades: string[] = Array.isArray(value) ? value : [];
  return (
    <div className={css.paletteValueGrid} role="group" aria-label={label}>
      {_buildShadeEntries(shades).map(({ key, shadeSlot, shade }) => (
        <HexColorInput
          // A shade's slot (0..9) is its Mantine palette identity.
          key={key}
          size="xs"
          aria-label={`${label}, shade ${shadeSlot}`}
          value={shade}
          allowAlpha={false}
          onChange={(color) =>
            onChange(
              shades.map((current, position) =>
                position === shadeSlot ? color : current,
              ),
            )
          }
        />
      ))}
    </div>
  );
}
