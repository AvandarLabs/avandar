import { useMemo } from "react";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createVideoThemeSourceFromSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { StoryFilm } from "../StoryFilm/StoryFilm";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Storyboard } from "../schema/schema";
import type { ProductSceneRenderer } from "../StoryFilm/ShotView";

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
export function ThemedStoryFilm({ plan, theme, productScene }: Props) {
  const themedPlan = useMemo(
    () => createContinuityPlanFromVideoThemeSnapshot(plan, theme, [plan.id]),
    [plan, theme],
  );
  return (
    <VideoThemeProvider
      source={createVideoThemeSourceFromSnapshot(theme, [plan.id])}
    >
      <StoryFilm plan={themedPlan} productScene={productScene} />
    </VideoThemeProvider>
  );
}
