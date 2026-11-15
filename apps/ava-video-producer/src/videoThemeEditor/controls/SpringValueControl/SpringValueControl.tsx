import { getDefaultLiteralFromKind } from "../getDefaultLiteralFromKind";
import { RangeNumberInput } from "../RangeNumberInput";
import css from "./SpringValueControl.module.css";
import type { SpringValue } from "../../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "../valueControl.types";

/** A spring token: damping, stiffness, and mass. A missing field shows its default. */
export function SpringValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const spring: SpringValue = {
    ...getDefaultLiteralFromKind("spring"),
    ...(value as Partial<SpringValue> | undefined),
  };
  const fields = [
    { key: "damping", name: "Damping", min: 1, max: 100, step: 1 },
    { key: "stiffness", name: "Stiffness", min: 1, max: 1000, step: 1 },
    { key: "mass", name: "Mass", min: 0.1, max: 10, step: 0.1 },
  ] as const;
  return (
    <div className={css.springValueFields} role="group" aria-label={label}>
      {fields.map((field) => (
        <RangeNumberInput
          key={field.key}
          size="xs"
          label={field.name}
          min={field.min}
          max={field.max}
          step={field.step}
          decimalScale={2}
          value={spring[field.key]}
          onChange={(fieldValue) =>
            onChange({ ...spring, [field.key]: fieldValue })
          }
        />
      ))}
    </div>
  );
}
