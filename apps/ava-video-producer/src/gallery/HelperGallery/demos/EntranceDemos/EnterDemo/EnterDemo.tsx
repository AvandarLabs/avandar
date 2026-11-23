import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "../../parts/DemoCard/DemoCard";
import css from "./EnterDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const ENTER_AT = 12;

/** Three ways to call `enter()`, side by side. */
const ENTER_VARIANTS = [
  { code: "enter(frame, 12)", options: {} },
  { code: "{ x: 16, y: 0 }", options: { x: 16, y: 0 } },
  { code: "{ scale: 0.94 }", options: { scale: 0.94 } },
] as const;

/** `enter()` with its default rise, a sideways arrival and a small scale. */
export function EnterDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const style = motion.enter(frame, ENTER_AT);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${ENTER_AT}, options)`}
      readouts={[
        {
          name: "opacity",
          value: DemoTheme.formatReadout({ value: Number(style.opacity) }),
        },
        { name: "transform", value: String(style.transform) },
      ]}
    >
      <div className={css.enterDemoCentered}>
        <div className={css.enterDemoCards}>
          {ENTER_VARIANTS.map((variant) => {
            return (
              <div key={variant.code} className={css.enterDemoCardColumn}>
                <DemoCard
                  title="Saved view"
                  style={motion.enter(frame, ENTER_AT, variant.options)}
                />
                <span className={css.enterDemoCaption}>{variant.code}</span>
              </div>
            );
          })}
        </div>
      </div>
    </HelperDemoFrame>
  );
}
