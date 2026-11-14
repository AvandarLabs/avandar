import { useLingui } from "@lingui/react/macro";
import { NumberInput, SegmentedControl, Text } from "@mantine/core";
import { CurvePlot } from "../../gallery/HelperGallery/demos/parts/CurvePlot";
import { createEasingFromToken } from "../../videoTheme/createEasingFromToken/createEasingFromToken";
import css from "./controls.module.css";
import type {
  EasingValue,
  SpringValue,
} from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";

type Bezier = readonly [number, number, number, number];

const DEFAULT_BEZIER: Bezier = [0.45, 0, 0.55, 1];

function _withPoint(points: Bezier, index: number, value: number): Bezier {
  const [x1, y1, x2, y2] = points;
  return [
    index === 0 ? value : x1,
    index === 1 ? value : y1,
    index === 2 ? value : x2,
    index === 3 ? value : y2,
  ];
}

function BezierFields({
  points,
  isCameraCurve,
  onChange,
}: Readonly<{
  points: Bezier;
  isCameraCurve: boolean;
  onChange: (points: Bezier) => void;
}>) {
  const { t } = useLingui();
  const names = [t`Start x`, t`Start y`, t`End x`, t`End y`];
  return (
    <div className={css.fields}>
      {points.map((point, index) => (
        <NumberInput
          key={names[index]}
          size="xs"
          label={names[index]}
          min={isCameraCurve || index % 2 === 0 ? 0 : -1}
          max={isCameraCurve || index % 2 === 0 ? 1 : 2}
          step={0.01}
          decimalScale={3}
          value={point}
          onChange={(next) =>
            typeof next === "number" &&
            onChange(_withPoint(points, index, next))
          }
        />
      ))}
    </div>
  );
}

/**
 * An easing token: a Bezier with four control values or a symmetric power
 * curve, drawn as a curve. A camera curve keeps its control points in 0..1
 * and offers only the cubic in-out power curve, the curves a camera supports.
 */
export function EasingValueControl({
  label,
  value,
  onChange,
  isCameraCurve = false,
}: ValueControlProps) {
  const { t } = useLingui();
  const easing = value as EasingValue;
  const power = "powerInOut" in easing ? easing.powerInOut : undefined;
  const points: Bezier | undefined =
    "powerInOut" in easing ? undefined : easing;
  const powerControl = isCameraCurve ? (
    <Text size="xs" c="dimmed">
      {t`Cubic in-out. Cameras support no other power curve.`}
    </Text>
  ) : (
    <NumberInput
      size="xs"
      label={t`Exponent`}
      min={1}
      max={8}
      step={0.5}
      decimalScale={2}
      value={power}
      onChange={(next) =>
        typeof next === "number" && onChange({ powerInOut: next })
      }
    />
  );
  return (
    <div className={css.easing} role="group" aria-label={label}>
      <SegmentedControl
        size="xs"
        aria-label={t`Curve type`}
        value={points ? "bezier" : "power"}
        data={[
          { value: "bezier", label: t`Bezier` },
          { value: "power", label: t`Power` },
        ]}
        onChange={(kind) =>
          onChange(kind === "power" ? { powerInOut: 3 } : DEFAULT_BEZIER)
        }
      />
      <div className={css.easingBody}>
        <CurvePlot
          easing={createEasingFromToken(easing)}
          t={1}
          size={96}
          handles={points}
        />
        {points ? (
          <BezierFields
            points={points}
            isCameraCurve={isCameraCurve}
            onChange={onChange}
          />
        ) : (
          powerControl
        )}
      </div>
    </div>
  );
}

/** A spring token: damping, stiffness, and mass. */
export function SpringValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const spring = value as SpringValue;
  const fields = [
    { key: "damping", name: t`Damping`, min: 1, max: 100, step: 1 },
    { key: "stiffness", name: t`Stiffness`, min: 1, max: 1000, step: 1 },
    { key: "mass", name: t`Mass`, min: 0.1, max: 10, step: 0.1 },
  ] as const;
  return (
    <div className={css.fields} role="group" aria-label={label}>
      {fields.map((field) => (
        <NumberInput
          key={field.key}
          size="xs"
          label={field.name}
          min={field.min}
          max={field.max}
          step={field.step}
          decimalScale={2}
          value={spring[field.key]}
          onChange={(next) =>
            typeof next === "number" &&
            onChange({ ...spring, [field.key]: next })
          }
        />
      ))}
    </div>
  );
}
