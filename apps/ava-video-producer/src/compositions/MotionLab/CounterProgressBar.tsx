import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import type { CSSProperties, ReactNode } from "react";
/** Shows the animated count's progress toward its target in `CounterCard`. */
export function CounterProgressBar({
  progress,
}: {
  progress: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const scales = useVideoShapeScales();
  const pill = scales.corner(semantic.corner.pill);
  return (
    <div
      style={{
        marginTop: mantine.spacing["22"],
        height: 5,
        background: semantic.color.scene.muted,
        borderRadius: pill,
      }}
    >
      <div
        style={{
          height: 5,
          width: `${progress * 100}%`,
          background: semantic.color.scene.brand,
          borderRadius: pill,
        }}
      />
    </div>
  );
}
