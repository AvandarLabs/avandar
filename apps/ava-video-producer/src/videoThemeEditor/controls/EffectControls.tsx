import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Fieldset,
  Group,
  NumberInput,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import { useState, type ReactNode } from "react";
import { elevationToBoxShadow } from "../../videoTheme/cssValues/cssValues";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import type {
  ShadowLayer,
  ShadowValue,
} from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";

type NumberField = Readonly<{
  key: string;
  name: string;
  min: number;
  max: number;
  step: number;
}>;
type NumberValues = Readonly<Record<string, number>>;

const DASH_PRESETS: Readonly<Record<string, readonly number[]>> = {
  solid: [],
  dotted: [1, 4],
  dashed: [6, 6],
};

function useEffectFields(): Readonly<
  Record<"shadow" | "glow" | "textShadow", readonly NumberField[]>
> {
  const { t } = useLingui();
  const offsetX = {
    key: "offsetX",
    name: t`Offset x`,
    min: -200,
    max: 200,
    step: 1,
  };
  const offsetY = {
    key: "offsetY",
    name: t`Offset y`,
    min: -200,
    max: 200,
    step: 1,
  };
  const blur = { key: "blur", name: t`Blur`, min: 0, max: 200, step: 1 };
  const alpha = { key: "alpha", name: t`Opacity`, min: 0, max: 1, step: 0.01 };
  return {
    shadow: [
      offsetX,
      offsetY,
      blur,
      { key: "spread", name: t`Spread`, min: -100, max: 100, step: 1 },
      alpha,
    ],
    glow: [
      { key: "spread", name: t`Spread`, min: -200, max: 200, step: 1 },
      { ...blur, max: 100 },
      { key: "opacity", name: t`Opacity`, min: 0, max: 1, step: 0.01 },
    ],
    textShadow: [
      { ...offsetX, min: -50, max: 50 },
      { ...offsetY, min: -50, max: 50 },
      { ...blur, max: 50 },
      alpha,
    ],
  };
}

function NumberFields({
  legend,
  fields,
  values,
  onChange,
  action,
}: Readonly<{
  legend: string;
  fields: readonly NumberField[];
  values: NumberValues;
  onChange: (values: NumberValues) => void;
  action?: ReactNode;
}>) {
  return (
    <Fieldset className={css.layer} legend={legend} variant="unstyled">
      <div className={css.fields}>
        {fields.map((field) => (
          <NumberInput
            key={field.key}
            size="xs"
            label={field.name}
            min={field.min}
            max={field.max}
            step={field.step}
            decimalScale={2}
            value={values[field.key]}
            onChange={(next) =>
              typeof next === "number" &&
              onChange({ ...values, [field.key]: next })
            }
          />
        ))}
      </div>
      {action}
    </Fieldset>
  );
}

/** A shadow token: up to four layers, previewed in the theme's shadow colour. */
export function ShadowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  const fields = useEffectFields().shadow;
  const shadow = value as ShadowValue;
  const setLayers = (layers: readonly ShadowLayer[]) => onChange({ layers });
  return (
    <div className={css.layers} role="group" aria-label={label}>
      {shadow.layers.map((layer, index) => {
        const layerNumber = index + 1;
        return (
          <NumberFields
            key={`layer-${String(layerNumber)}`}
            legend={t`Layer ${layerNumber}`}
            fields={fields}
            values={layer}
            onChange={(next) =>
              setLayers(
                shadow.layers.map((current, position) =>
                  position === index ? (next as ShadowLayer) : current,
                ),
              )
            }
            action={
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() =>
                  setLayers(
                    shadow.layers.filter((_, position) => position !== index),
                  )
                }
              >
                {t`Remove layer ${layerNumber}`}
              </Button>
            }
          />
        );
      })}
      <Group gap="xs">
        <Button
          size="compact-xs"
          variant="default"
          disabled={shadow.layers.length >= 4}
          onClick={() =>
            setLayers([
              ...shadow.layers,
              { offsetX: 0, offsetY: 4, blur: 8, spread: 0, alpha: 0.2 },
            ])
          }
        >
          {t`Add layer`}
        </Button>
        <span
          className={css.shadowPreview}
          style={{
            boxShadow: elevationToBoxShadow({
              layers: shadow.layers,
              color: theme.semantic.color.shadowColor,
            }),
          }}
          aria-hidden="true"
        />
      </Group>
    </div>
  );
}

/** A glow token: spread, blur, and opacity. */
export function GlowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const fields = useEffectFields().glow;
  return (
    <NumberFields
      legend={label}
      fields={fields}
      values={value as NumberValues}
      onChange={onChange}
    />
  );
}

/** A text shadow token: offsets, blur, and opacity. Its colour comes from the type style. */
export function TextShadowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const fields = useEffectFields().textShadow;
  return (
    <NumberFields
      legend={label}
      fields={fields}
      values={value as NumberValues}
      onChange={onChange}
    />
  );
}

function _parseDash(text: string): readonly number[] | undefined {
  const parts = text.trim()
    ? text
        .trim()
        .split(/[\s,]+/)
        .map(Number)
    : [];
  return parts.length <= 8 &&
    parts.every((part) => Number.isFinite(part) && part >= 0)
    ? parts
    : undefined;
}

/** A dash pattern: presets plus exact dash and gap lengths, previewed as a line. */
export function DashValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const pattern = Array.isArray(value) ? (value as readonly number[]) : [];
  const [text, setText] = useState(pattern.join(" "));
  const preset =
    Object.entries(DASH_PRESETS).find(
      ([, dashes]) => dashes.join(" ") === pattern.join(" "),
    )?.[0] ?? "";
  const apply = (dashes: readonly number[]) => {
    setText(dashes.join(" "));
    onChange(dashes);
  };
  return (
    <div className={css.stack} role="group" aria-label={label}>
      <SegmentedControl
        size="xs"
        aria-label={t`Dash preset`}
        value={preset}
        data={[
          { value: "solid", label: t`Solid` },
          { value: "dotted", label: t`Dotted` },
          { value: "dashed", label: t`Dashed` },
        ]}
        onChange={(next) => apply(DASH_PRESETS[next] ?? [])}
      />
      <TextInput
        size="xs"
        label={t`Dash and gap lengths`}
        value={text}
        error={
          _parseDash(text)
            ? undefined
            : t`Use up to eight numbers separated by spaces.`
        }
        onChange={(event) => {
          const next = event.currentTarget.value;
          setText(next);
          const dashes = _parseDash(next);
          if (dashes) {
            onChange(dashes);
          }
        }}
      />
      <svg className={css.dashPreview} viewBox="0 0 160 8" aria-hidden="true">
        <line
          x1={0}
          y1={4}
          x2={160}
          y2={4}
          strokeDasharray={pattern.join(" ")}
        />
      </svg>
    </div>
  );
}
