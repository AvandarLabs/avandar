import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import {
  useVideoProps,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { useContinuityAppearance } from "../ContinuityAppearanceContext/useContinuityAppearance";
import { OverlayMotion } from "../OverlayMotion/OverlayMotion";
import { ContinuityAnnotationCue } from "./ContinuityAnnotationCue";
import type { ProductAnnotation } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  annotations?: ProductAnnotation[];
  frame: number;
  accent: string;
};

/** Seeded hand-drawn marks retain the measured product coordinates exactly. */
export function ContinuityAnnotation({
  annotations = [],
  frame,
  accent,
}: Props): ReactNode {
  const appearance = useContinuityAppearance();
  const { sketch } = useVideoTokens();
  const annotation = useVideoProps({
    name: "Annotation",
    props: {},
  });
  const motion = useVideoMotion();
  if (!appearance.annotations) {
    return null;
  }
  return annotations.map((cue, index) => {
    const progress = OverlayMotion.getAnnotationProgress({
      frame,
      cue,
      timing: {
        duration: motion.scale(annotation.drawIn),
        easing: motion.reveal.easing,
      },
    });
    if (progress <= 0) {
      return null;
    }
    return (
      <ContinuityAnnotationCue
        cue={cue}
        progress={progress}
        accent={accent}
        roughness={sketch.annotation.roughness}
        strokeWidth={annotation.strokeWidth}
        highlightAlpha={annotation.highlightAlpha}
        key={`${cue.at}-${index}`}
      />
    );
  });
}
