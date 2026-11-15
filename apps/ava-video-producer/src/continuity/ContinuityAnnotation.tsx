import {
  Box,
  Bracket,
  Circle,
  Highlight,
  Underline,
} from "@remotion/rough-notation";
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
  if (!appearance.annotations) return null;
  return annotations.map((cue, index) => {
    const progress = getAnnotationProgress(frame, cue);
    if (progress <= 0) return null;
    const Annotation = notation[cue.kind];
    return (
      <div
        key={`${cue.at}-${index}`}
        className={css.annotation}
        style={{
          left: cue.target.x,
          top: cue.target.y,
          opacity: cue.kind === "highlight" ? 0.4 : 1,
        }}
      >
        <Annotation
          progress={progress}
          color={accent}
          roughness={appearance.annotationRoughness}
          seed={cue.seed}
          strokeWidth={3}
        >
          <div style={{ width: cue.target.width, height: cue.target.height }} />
        </Annotation>
      </div>
    );
  });
}
