import { TextLayout } from "../../../layout/TextLayout";
import { positioned } from "../../../positioned";
import { StageTheme } from "../../../StageTheme/StageTheme";
import type { BarComparisonMotion } from "../../BarComparisonMotion/BarComparisonMotion";
import type { PanelProps as PanelInput } from "../../BarComparisonScene.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  panel: PanelInput["panel"];
  rect: PanelInput["rect"];
  theme: PanelInput["theme"];
  motion: PanelInput["motion"];
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
  hero: ReturnType<typeof TextLayout.fitTextLines>;
  heroHeight: number;
  scene: PanelInput["theme"]["semantic"]["color"]["scene"];
};
/** Renders bar hero. */
export function BarHero({
  frame,
  panel,
  rect,
  theme,
  motion,
  beats,
  hero,
  heroHeight,
  scene,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        ...positioned({ ...rect, height: heroHeight }),
        fontSize: hero.fontSize,
        ...StageTheme.getStageTextStyle({
          role: theme.semantic.text.stage.heroFigure,
          fields: ["fontWeight", "lineHeight", "letterSpacing"],
        }),
        ...motion.enter(frame, beats.heroAt, {
          dur: motion.panel,
          easing: motion.rise.easing,
        }),
      }}
    >
      {TextLayout.formatMetric({
        value: panel.value,
        precision: panel.precision ?? 0,
      })}
      {panel.unit ? (
        <span
          style={{
            color: scene.brand,
            fontSize: `${theme.components.BarComparison.unitScale}em`,
          }}
        >
          {panel.unit}
        </span>
      ) : null}
    </div>
  );
}
