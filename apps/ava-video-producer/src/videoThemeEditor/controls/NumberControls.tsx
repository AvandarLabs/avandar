import { useLingui } from "@lingui/react/macro";
import { Group, Slider } from "@mantine/core";
import { parseCssPixels } from "../../videoTheme/normalizeTokenValue/normalizeTokenValue";
import css from "./controls.module.css";
import { RangeNumberInput } from "./RangeNumberInput";
import type { ValueControlProps } from "./valueControl.types";

const SLIDER_STEP_LIMIT = 1000;
const UNIT_SUFFIXES: Readonly<Record<string, string>> = {
  px: " px",
  em: " em",
  "%": "%",
  deg: "°",
  "×": "×",
  cps: " cps",
};

function _output(kind: string, value: number): unknown {
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
}: ValueControlProps) {
  const scale = definition.unit === "%" ? 100 : 1;
  const min = (definition.min ?? 0) * scale;
  const max = (definition.max ?? 100) * scale;
  const step = (definition.step ?? 1) * scale;
  const shown = Number(
    ((parseCssPixels(value) ?? min / scale) * scale).toFixed(4),
  );
  const emit = (next: number) =>
    onChange(_output(definition.kind, Number((next / scale).toFixed(6))));
  return (
    <Group className={css.numberRow} gap="xs" wrap="nowrap">
      {(max - min) / step <= SLIDER_STEP_LIMIT ? (
        <Slider
          className={css.slider}
          size="sm"
          min={min}
          max={max}
          step={step}
          value={shown}
          thumbLabel={label}
          label={null}
          onChange={emit}
        />
      ) : null}
      <RangeNumberInput
        className={css.numberInput}
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

/** A duration token in frames, with its length in milliseconds beside it. */
export function DurationValueControl({
  label,
  definition,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const frames = typeof value === "number" ? value : 0;
  const milliseconds = Math.round((frames / 30) * 1000);
  return (
    <Group className={css.numberRow} gap="xs" wrap="nowrap">
      <RangeNumberInput
        className={css.numberInput}
        size="xs"
        aria-label={label}
        min={definition.min ?? 0}
        max={definition.max ?? 600}
        step={1}
        allowDecimal={false}
        suffix={t` frames`}
        value={frames}
        onChange={onChange}
      />
      <span className={css.readout}>{t`${milliseconds} ms`}</span>
    </Group>
  );
}
