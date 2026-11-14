import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Fieldset,
  Group,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import { elevationToBoxShadow } from "../../videoTheme/cssValues/cssValues";
import { useRowHasIssue } from "../RowIssueContext/RowIssueContext";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import {
  formatDashPattern,
  parseDashDraft,
} from "./controlValues/controlValues";
import { getDefaultLiteralFromKind } from "./defaultLiterals";
import { RangeNumberInput } from "./RangeNumberInput";
import { useDraftValue } from "./useDraftValue";
import type {
  ShadowLayer,
  ShadowValue,
} from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

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
const MAX_SHADOW_LAYERS = 4;
const DEFAULT_SHADOW = getDefaultLiteralFromKind("shadow") as ShadowValue;
const DEFAULT_SHADOW_LAYER = DEFAULT_SHADOW.layers[0] as ShadowLayer;

/** Field names and ranges for each effect kind, translated. */
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

/** One set of effect numbers under a legend. A missing value shows its default. */
function _NumberFields({
  legend,
  fields,
  values,
  fallback,
  onChange,
  action,
}: Readonly<{
  legend: string;
  fields: readonly NumberField[];
  values: NumberValues;
  fallback: NumberValues;
  onChange: (values: NumberValues) => void;
  action?: ReactNode;
}>) {
  const current = { ...fallback, ...values };
  return (
    <Fieldset className={css.layer} legend={legend} variant="unstyled">
      <div className={css.fields}>
        {fields.map((field) => (
          <RangeNumberInput
            key={field.key}
            size="xs"
            label={field.name}
            min={field.min}
            max={field.max}
            step={field.step}
            decimalScale={2}
            value={current[field.key] ?? 0}
            onChange={(next) => onChange({ ...current, [field.key]: next })}
          />
        ))}
      </div>
      {action}
    </Fieldset>
  );
}

/** The editable layers of a shadow, each with its own remove action. */
function ShadowLayers({
  layers,
  onChange,
}: Readonly<{
  layers: readonly ShadowLayer[];
  onChange: (layers: readonly ShadowLayer[]) => void;
}>) {
  const { t } = useLingui();
  const fields = useEffectFields().shadow;
  return layers.map((layer, index) => {
    const layerNumber = index + 1;
    return (
      <_NumberFields
        // A layer has no identity apart from its position in the stack.
        key={`layer-${String(layerNumber)}`}
        legend={t`Layer ${layerNumber}`}
        fields={fields}
        values={layer}
        fallback={DEFAULT_SHADOW_LAYER}
        onChange={(next) =>
          onChange(
            layers.map((current, position) =>
              position === index
                ? { ...DEFAULT_SHADOW_LAYER, ...next }
                : current,
            ),
          )
        }
        action={
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() =>
              onChange(layers.filter((_, position) => position !== index))
            }
          >
            {t`Remove layer ${layerNumber}`}
          </Button>
        }
      />
    );
  });
}

/** A shadow token: up to four layers, previewed in the theme's shadow colour. */
export function ShadowValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  const layers = (value as ShadowValue | undefined)?.layers ?? [];
  const setLayers = (nextLayers: readonly ShadowLayer[]) =>
    onChange({ layers: nextLayers });
  const boxShadow = elevationToBoxShadow({
    layers,
    color: theme.semantic.color.shadowColor,
  });
  return (
    <div className={css.layers} role="group" aria-label={label}>
      <ShadowLayers layers={layers} onChange={setLayers} />
      <Group gap="xs">
        <Button
          size="compact-xs"
          variant="default"
          disabled={layers.length >= MAX_SHADOW_LAYERS}
          onClick={() => setLayers([...layers, DEFAULT_SHADOW_LAYER])}
        >
          {t`Add layer`}
        </Button>
        <span
          className={css.shadowPreview}
          style={{ boxShadow }}
          aria-hidden="true"
          data-inherit-dim
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
    <_NumberFields
      legend={label}
      fields={fields}
      values={(value ?? {}) as NumberValues}
      fallback={getDefaultLiteralFromKind("glow") as NumberValues}
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
    <_NumberFields
      legend={label}
      fields={fields}
      values={(value ?? {}) as NumberValues}
      fallback={getDefaultLiteralFromKind("textShadow") as NumberValues}
      onChange={onChange}
    />
  );
}

/** Solid, dotted, and dashed presets. Shows no selection for a custom pattern. */
function DashPresets({
  pattern,
  onChange,
}: Readonly<{
  pattern: readonly number[];
  onChange: (pattern: readonly number[]) => void;
}>) {
  const { t } = useLingui();
  const patternText = formatDashPattern(pattern);
  const preset =
    Object.entries(DASH_PRESETS).find(
      ([, dashes]) => formatDashPattern(dashes) === patternText,
    )?.[0] ?? "";
  return (
    <SegmentedControl
      size="xs"
      aria-label={t`Dash preset`}
      value={preset}
      data={[
        { value: "solid", label: t`Solid` },
        { value: "dotted", label: t`Dotted` },
        { value: "dashed", label: t`Dashed` },
      ]}
      onChange={(next) => onChange(DASH_PRESETS[next] ?? [])}
    />
  );
}

/** A line drawn with a dash pattern. */
function _DashPreview({ pattern }: Readonly<{ pattern: readonly number[] }>) {
  return (
    <svg
      className={css.dashPreview}
      viewBox="0 0 160 8"
      aria-hidden="true"
      data-inherit-dim
    >
      <line
        x1={0}
        y1={4}
        x2={160}
        y2={4}
        strokeDasharray={formatDashPattern(pattern)}
      />
    </svg>
  );
}

/** A dash pattern: presets plus exact dash and gap lengths, previewed as a line. */
export function DashValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const hasIssue = useRowHasIssue();
  const pattern = Array.isArray(value) ? (value as readonly number[]) : [];
  const field = useDraftValue<readonly number[], string>({
    value: pattern,
    toKey: formatDashPattern,
    toDraft: formatDashPattern,
    parse: parseDashDraft,
    onChange,
  });
  return (
    <div className={css.stack} role="group" aria-label={label}>
      <DashPresets pattern={pattern} onChange={onChange} />
      <TextInput
        size="xs"
        label={t`Dash and gap lengths`}
        value={field.draft}
        error={
          field.isValid
            ? hasIssue
            : t`Use up to eight numbers separated by spaces.`
        }
        onChange={(event) => field.change(event.currentTarget.value)}
      />
      <_DashPreview pattern={pattern} />
    </div>
  );
}
