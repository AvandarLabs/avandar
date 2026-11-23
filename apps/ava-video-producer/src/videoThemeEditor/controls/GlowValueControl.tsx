import { EFFECT_FIELDS } from "./effectControls.constants";
import { getDefaultLiteralFromKind } from "./getDefaultLiteralFromKind";
import { NumberFields, type NumberValues } from "./NumberFields/NumberFields";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;

/** A glow token: spread, blur, and opacity. */
export function GlowValueControl({
  label,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <NumberFields
      legend={label}
      fields={EFFECT_FIELDS.glow}
      values={(value ?? {}) as NumberValues}
      fallback={getDefaultLiteralFromKind("glow")}
      onChange={onChange}
    />
  );
}
