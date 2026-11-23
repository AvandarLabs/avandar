import { formatDashPattern } from "../../controlValueHelpers/controlValueHelpers";
import css from "./DashPreview.module.css";

type Props = Readonly<{ pattern: readonly number[] }>;

/** A line drawn with a dash pattern. */
export function DashPreview({ pattern }: Props) {
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
