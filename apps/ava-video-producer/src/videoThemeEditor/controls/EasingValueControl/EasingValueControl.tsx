import { SegmentedControl } from "@mantine/core";
import { CurvePlot } from "../../../gallery/HelperGallery/demos/parts/CurvePlot/CurvePlot";
import { makeEasingFromToken } from "../../../videoTheme/makeEasingFromToken/makeEasingFromToken";
import { useRowIssueAriaProps } from "../../RowIssueContext/rowIssueHelpers";
import { getDefaultLiteralFromKind } from "../getDefaultLiteralFromKind";
import { BezierFields } from "./BezierFields/BezierFields";
import css from "./EasingValueControl.module.css";
import { PowerFields } from "./PowerFields";
import type { EasingValue } from "../../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;

const DEFAULT_BEZIER = getDefaultLiteralFromKind("easing");
const DEFAULT_POWER: EasingValue = { powerInOut: 3 };

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
}: Readonly<Props>): ReactNode {
  const issueAriaProps = useRowIssueAriaProps();
  const easing = (value ?? DEFAULT_BEZIER) as EasingValue;
  const points = "powerInOut" in easing ? undefined : easing;
  const power = "powerInOut" in easing ? easing.powerInOut : 3;
  return (
    <div className={css.easingValueControl} role="group" aria-label={label}>
      <SegmentedControl
        size="xs"
        aria-label="Curve type"
        {...issueAriaProps}
        value={points ? "bezier" : "power"}
        data={[
          { value: "bezier", label: "Bezier" },
          { value: "power", label: "Power" },
        ]}
        onChange={(kind) => {
          return onChange(kind === "power" ? DEFAULT_POWER : DEFAULT_BEZIER);
        }}
      />
      <div className={css.easingValueControlBody}>
        <CurvePlot
          easing={makeEasingFromToken(easing)}
          t={1}
          size={96}
          handles={points}
        />
        {points ? (
          <BezierFields {...{ points, isCameraCurve, onChange }} />
        ) : (
          <PowerFields {...{ power, isCameraCurve, onChange }} />
        )}
      </div>
    </div>
  );
}
