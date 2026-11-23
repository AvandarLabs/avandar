import { getValueAtPath } from "../../getValueAtPath";
import type { VideoThemeIssue, VideoThemePatch } from "../../videoTheme.types";
import type { ResolutionContext } from "./ResolvedTokenTiers.types";
import type { MantineTheme } from "@mantine/core";
/** The context that resolves the ground colour, before the ground is known. */
export function createGroundContext({
  options,
  issues,
}: Readonly<{
  options: Readonly<{
    merged: VideoThemePatch;
    mantine: MantineTheme;
  }>;
  issues: VideoThemeIssue[];
}>): ResolutionContext {
  const video = getValueAtPath({
    source: options.merged,
    path: ["other", "video"],
  });
  return {
    atomic: getValueAtPath({
      source: video,
      path: ["atomic"],
    }),
    semantic: getValueAtPath({
      source: video,
      path: ["semantic"],
    }),
    components: options.merged.components,
    mantine: options.mantine,
    isDarkGround: true,
    forbidColorPairs: true,
    issues,
  };
}
