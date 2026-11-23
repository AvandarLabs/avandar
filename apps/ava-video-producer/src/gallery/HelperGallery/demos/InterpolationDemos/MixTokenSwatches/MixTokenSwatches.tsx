import { Motion } from "../../../../../motion";
import { useVideoShapeScales } from "../../../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { InterpolationDemosShared } from "../InterpolationDemosShared/InterpolationDemosShared";
import css from "./MixTokenSwatches.module.css";
import type { ReactNode } from "react";

type Props = {
  t: number;
};
/**
 * A chip turning on and off through `mixToken()` rather than snapping,
 * between the theme's scene border and brand.
 */
/** The mix in steps, with the step nearest `t` outlined. */
export function MixTokenSwatches({ t }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const scene = tokens.color.scene;
  const scales = useVideoShapeScales();
  const { highlight } = DemoTheme.useDemoColors();
  return (
    <div className={css.mixTokenSwatchesSwatchStrip}>
      {InterpolationDemosShared.SWATCH_STEPS.map((step) => {
        return (
          <span
            key={step}
            className={css.mixTokenSwatchesSwatch}
            style={{
              background: Motion.mixToken({
                t: step,
                from: scene.border,
                to: scene.brand,
              }),
              outline:
                Math.abs(step - t) < 0.05
                  ? `${scales.stroke(tokens.stroke.default)}px solid ${highlight}`
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
