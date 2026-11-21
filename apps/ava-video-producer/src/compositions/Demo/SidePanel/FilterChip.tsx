import { Motion } from "../../../motion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

type Props = {
  chip: string;
  lit: number;
  scale: number;
};
/** One filter chip, lit from 0 to 1, at its press scale. */
export function FilterChip({ chip, lit, scale }: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        padding: `${mantine.spacing["10"]} ${mantine.spacing["18"]}`,
        borderRadius: scales.corner(semantic.corner.pill),
        fontSize: mantine.fontSizes.lg,
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${Motion.mixToken(
          {
            t: lit,
            from: scene.border,
            to: scene.brand,
          },
        )}`,
        background: Motion.mixToken({
          t: lit,
          from: "transparent",
          to: scene.brandSoft,
        }),
        color: Motion.mixToken({
          t: lit,
          from: scene.mutedForeground,
          to: scene.brandStrong,
        }),
        transform: `scale(${scale.toFixed(4)})`,
      }}
    >
      {chip}
    </div>
  );
}
