import { useMemo } from "react";
import { ContinuityThemePlans } from "../continuity/ContinuityThemePlans/ContinuityThemePlans";
import { VideoThemeProvider } from "../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { VideoThemeSnapshots } from "../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { StoryFilm } from "./StoryFilm/StoryFilm";
import type { VideoThemeSnapshot } from "../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { Storyboard } from "./schema/schema";
import type { ProductSceneRenderer } from "./StoryFilm/ShotView";
import type { ReactNode } from "react";

type Props = Readonly<{
  plan: Storyboard;
  theme?: VideoThemeSnapshot;
  productScene?: ProductSceneRenderer;
}>;
/**
 * A storyboard film drawn inside its theme, scoped by the plan id so the
 * theme's override for that composition applies. The root of every
 * `story-film` composition the `video` CLI renders.
 */
export function ThemedStoryFilm({
  plan,
  theme,
  productScene,
}: Props): ReactNode {
  const themedPlan = useMemo(() => {
    return ContinuityThemePlans.fromVideoThemeSnapshot({
      plan,
      snapshot: theme,
      overrideIds: [plan.id],
    });
  }, [plan, theme]);
  return (
    <VideoThemeProvider
      source={VideoThemeSnapshots.toSource({
        snapshot: theme,
        overrideIds: [plan.id],
      })}
    >
      <StoryFilm plan={themedPlan} productScene={productScene} />
    </VideoThemeProvider>
  );
}
