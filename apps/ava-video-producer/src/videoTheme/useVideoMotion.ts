import { useMemo } from "react";
import {
  makeVideoMotionFromTokens,
  type VideoMotion,
} from "./makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import { useVideoTokens } from "./videoThemeHelpers";

/**
 * Tempo-scaled motion for stage components inside a video theme provider,
 * for example a beat heading's entrance. See `VideoMotion`.
 */
export function useVideoMotion(): VideoMotion {
  const { motion } = useVideoTokens();
  return useMemo(() => {
    return makeVideoMotionFromTokens(motion);
  }, [motion]);
}
