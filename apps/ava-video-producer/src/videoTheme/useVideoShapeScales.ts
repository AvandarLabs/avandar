import { useMemo } from "react";
import {
  createVideoShapeScales,
  type VideoShapeScales,
} from "./createVideoShapeScales/createVideoShapeScales";
import { useVideoTokens } from "./useVideoTheme";

/**
 * Line weight, corner style, and tint strength for stage components inside
 * a video theme provider, for example a scene card's border and radius. See
 * `VideoShapeScales`.
 */
export function useVideoShapeScales(): VideoShapeScales {
  const { stroke, corner, alpha } = useVideoTokens();
  return useMemo(() => {
    return createVideoShapeScales({ stroke, corner, alpha });
  }, [stroke, corner, alpha]);
}
