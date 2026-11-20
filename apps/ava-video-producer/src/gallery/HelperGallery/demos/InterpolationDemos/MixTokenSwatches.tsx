import { mixToken } from "../../../../motion";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { InterpolationDemosShared } from "./InterpolationDemosShared/InterpolationDemosShared";
import type { ReactNode } from "react";
/**
 * A chip turning on and off through `mixToken()` rather than snapping,
 * between the theme's scene border and brand.
 */
/** The mix in steps, with the step nearest `t` outlined. */
export function MixTokenSwatches({ t }: { t: number }): ReactNode {
  const tokens = useVideoTokens();
  const scene = tokens.color.scene;
  const scales = useVideoShapeScales();
  const { highlight } = DemoTheme.useDemoColors();
  return (
    <div className={css.swatchStrip}>
      {InterpolationDemosShared.SWATCH_STEPS.map((step) => {
        return (
          <span
            key={step}
            className={css.swatch}
            style={{
              background: mixToken(step, scene.border, scene.brand),
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
