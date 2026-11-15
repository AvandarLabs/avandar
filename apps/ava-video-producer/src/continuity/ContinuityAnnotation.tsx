import {
  Box,
  Bracket,
  Circle,
  Highlight,
  Underline,
} from "@remotion/rough-notation";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import css from "./ContinuityOverlays.module.css";
import { getAnnotationProgress } from "./overlayMotion";
import type { ProductAnnotation } from "./continuitySchema";

type Props = {
  annotations?: ProductAnnotation[];
  frame: number;
  accent: string;
};
const notation = {
  box: Box,
  bracket: Bracket,
  circle: Circle,
  highlight: Highlight,
  underline: Underline,
};

/** Seeded hand-drawn marks retain the measured product coordinates exactly. */
export function ContinuityAnnotation({
  annotations = [],
  frame,
  accent,
}: Props) {
  const appearance = useContinuityAppearance();
  const { sketch } = useVideoTokens();
  const annotation = useVideoProps("Annotation", {});
  const motion = useVideoMotion();
  if (!appearance.annotations) return null;
  return annotations.map((cue, index) => {
    const progress = getAnnotationProgress(
      frame,
      cue,
      motion.scale(annotation.drawIn),
    );
    if (progress <= 0) return null;
    const Annotation = notation[cue.kind];
    return (
      <div
        key={`${cue.at}-${index}`}
        className={css.annotation}
        style={{
          left: cue.target.x,
          top: cue.target.y,
          opacity: cue.kind === "highlight" ? annotation.highlightAlpha : 1,
        }}
      >
        <Annotation
          progress={progress}
          color={accent}
          roughness={sketch.annotation.roughness}
          seed={cue.seed}
          strokeWidth={annotation.strokeWidth}
        >
          <div style={{ width: cue.target.width, height: cue.target.height }} />
        </Annotation>
      </div>
    );
  });
}
