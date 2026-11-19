import { Fieldset } from "@mantine/core";
import { RangeNumberInput } from "../RangeNumberInput";
import css from "./NumberFields.module.css";
import type { ReactNode } from "react";

export type NumberField = Readonly<{
  key: string;
  name: string;
  min: number;
  max: number;
  step: number;
}>;
export type NumberValues = Readonly<Record<string, number>>;

type Props = Readonly<{
  legend: string;
  fields: readonly NumberField[];
  values: NumberValues;
  fallback: NumberValues;
  onChange: (values: NumberValues) => void;
  action?: ReactNode;
}>;

/**
 * One set of effect numbers under a legend. A missing value shows its default.
 */
export function NumberFields({
  legend,
  fields,
  values,
  fallback,
  onChange,
  action,
}: Props): ReactNode {
  const current = { ...fallback, ...values };
  return (
    <Fieldset
      className={css.numberFieldsLayer}
      legend={legend}
      variant="unstyled"
    >
      <div className={css.numberFieldsGrid}>
        {fields.map((field) => {
          return (
            <RangeNumberInput
              key={field.key}
              size="xs"
              label={field.name}
              min={field.min}
              max={field.max}
              step={field.step}
              decimalScale={2}
              value={current[field.key] ?? 0}
              onChange={(fieldValue) => {
                return onChange({ ...current, [field.key]: fieldValue });
              }}
            />
          );
        })}
      </div>
      {action}
    </Fieldset>
  );
}
