import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import css from "./BarRow.module.css";
import type { BarComparisonMotion } from "../../../../../scenes/BarComparisonScene/BarComparisonMotion/BarComparisonMotion";
import type { ReactNode } from "react";

type BarRowProps = {
  frame: number;
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
  index: number;
  label: string;
  value: number;
  fraction: number;
};

/** One row of the bar panel: label, growing bar and value, on their beats. */
export function BarRow({
  frame,
  beats,
  index,
  label,
  value,
  fraction,
}: Readonly<BarRowProps>): ReactNode {
  const motion = useVideoMotion();
  const offset = index * motion.stagger.list;
  const growth = motion.ramp(
    frame,
    beats.barsAt + offset,
    motion.sheet,
    motion.rise.easing,
  );
  return (
    <div className={css.barRowRow}>
      <span
        className={css.barRowBarLabel}
        style={motion.enter(frame, beats.labelsAt + offset)}
      >
        {label}
      </span>
      <span
        className={css.barRowBar}
        style={{ width: growth * fraction * 520 }}
      />
      <span
        className={css.barRowBarValue}
        style={motion.enter(frame, beats.valuesAt + offset)}
      >
        {value}
      </span>
    </div>
  );
}
