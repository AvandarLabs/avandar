import { useMemo } from "react";
import rough from "roughjs";
import css from "./controls.module.css";
import type { ResolvedSketchProfile } from "../../videoTheme/videoTheme.types";

/** A small box drawn with a sketch profile, so roughness, bowing, and seed can be judged by eye. */
export function SketchPreview({
  profile,
}: Readonly<{ profile: ResolvedSketchProfile | undefined }>) {
  const paths = useMemo(() => {
    if (!profile) {
      return [];
    }
    const generator = rough.generator();
    return generator.toPaths(
      generator.rectangle(4, 4, 88, 36, {
        roughness: profile.roughness,
        bowing: profile.bowing,
        seed: profile.seed,
        maxRandomnessOffset: profile.randomness,
        stroke: "currentColor",
        strokeWidth: 1.5,
      }),
    );
  }, [profile]);
  return (
    <svg className={css.sketchPreview} viewBox="0 0 96 44" aria-hidden="true">
      {paths.map((path) => (
        <path
          key={path.d}
          d={path.d}
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
          fill={path.fill ?? "none"}
        />
      ))}
    </svg>
  );
}
