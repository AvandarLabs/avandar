import { Group } from "@mantine/core";
import { parseCssPixels } from "../../../videoTheme/parseCssPixels/parseCssPixels";
import { RangeNumberInput } from "../RangeNumberInput";
import { NumberSlider } from "./NumberSlider/NumberSlider";
import css from "./NumberValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

const SLIDER_STEP_LIMIT = 1000;
const UNIT_SUFFIXES: Readonly<Record<string, string>> = {
  px: " px",
  em: " em",
  "%": "%",
  deg: "°",
  "×": "×",
  cps: " cps",
};

function _buildTokenValue(kind: string, value: number): number | string {
  if (kind === "cssLength") {
    return `${value}px`;
  }
  return kind === "cssNumber" ? String(value) : value;
}

/**
 * A number token: a slider when the range is short, and an exact input with
 * its unit. Opacity reads as a percentage; Mantine strings round-trip.
 */
export function NumberValueControl({
  label,
  definition,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const scale = definition.unit === "%" ? 100 : 1;
  const min = (definition.min ?? 0) * scale;
  const max = (definition.max ?? 100) * scale;
  const step = (definition.step ?? 1) * scale;
  const shown = Number(
    ((parseCssPixels(value) ?? min / scale) * scale).toFixed(4),
  );
  const emit = (shownNumber: number) => {
    return onChange(
      _buildTokenValue(
        definition.kind,
        Number((shownNumber / scale).toFixed(6)),
      ),
    );
  };
  return (
    <Group className={css.numberValueRow} gap="xs" wrap="nowrap">
      {(max - min) / step <= SLIDER_STEP_LIMIT ? (
        <NumberSlider
          label={label}
          min={min}
          max={max}
          step={step}
          value={shown}
          onChange={emit}
        />
      ) : null}
      <RangeNumberInput
        className={css.numberValueInput}
        size="xs"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        decimalScale={4}
        suffix={definition.unit ? UNIT_SUFFIXES[definition.unit] : undefined}
        value={shown}
        onChange={emit}
      />
    </Group>
  );
}
