import { EFFECT_FIELDS } from "./effectControls.constants";
import { getDefaultLiteralFromKind } from "./getDefaultLiteralFromKind";
import { NumberFields, type NumberValues } from "./NumberFields/NumberFields";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

/**
 * A text shadow token: offsets, blur, and opacity. Its colour comes from the
 * type style.
 */
export function TextShadowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  return (
    <NumberFields
      legend={label}
      fields={EFFECT_FIELDS.textShadow}
      values={(value ?? {}) as NumberValues}
      fallback={getDefaultLiteralFromKind("textShadow")}
      onChange={onChange}
    />
  );
}
