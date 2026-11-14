import { useMemo } from "react";
import {
  createVideoMotion,
  type VideoMotion,
} from "../createVideoMotion/createVideoMotion";
import { useVideoTokens } from "../useVideoTheme/useVideoTheme";

/**
 * Tempo-scaled motion for stage components inside a video theme provider,
 * for example a beat heading's entrance. See `VideoMotion`.
 */
export function useVideoMotion(): VideoMotion {
  const { motion } = useVideoTokens();
  return useMemo(() => createVideoMotion(motion), [motion]);
}
