import { useMemo } from "react";
import {
  makeVideoShapeScalesFromSemanticTokens,
  type VideoShapeScales,
} from "./makeVideoShapeScalesFromSemanticTokens/makeVideoShapeScalesFromSemanticTokens";
import { useVideoTokens } from "./videoThemeHelpers";

/**
 * Line weight, corner style, and tint strength for stage components inside
 * a video theme provider, for example a scene card's border and radius. See
 * `VideoShapeScales`.
 */
export function useVideoShapeScales(): VideoShapeScales {
  const { stroke, corner, alpha } = useVideoTokens();
  return useMemo(() => {
    return makeVideoShapeScalesFromSemanticTokens({ stroke, corner, alpha });
  }, [stroke, corner, alpha]);
}
