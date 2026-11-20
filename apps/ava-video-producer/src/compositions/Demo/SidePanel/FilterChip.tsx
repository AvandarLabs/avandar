import { mix, mixToken } from "../../../motion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import type { ReactNode } from "react";
/** One filter chip, lit from 0 to 1, at its press scale. */
export function FilterChip({
  chip,
  lit,
  scale,
}: {
  chip: string;
  lit: number;
  scale: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        padding: `${mantine.spacing["10"]} ${mantine.spacing["18"]}`,
        borderRadius: scales.corner(semantic.corner.pill),
        fontSize: mantine.fontSizes.lg,
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${mixToken(lit, scene.border, scene.brand)}`,
        background: mixToken(lit, "transparent", scene.brandSoft),
        color: mixToken(lit, scene.mutedForeground, scene.brandStrong),
        transform: `scale(${scale.toFixed(4)})`,
      }}
    >
      {chip}
    </div>
  );
}
