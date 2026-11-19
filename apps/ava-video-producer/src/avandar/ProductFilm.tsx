import { ThemedStoryFilm } from "../storyboard/ThemedStoryFilm";
import { AvandarScene } from "./AvandarScene";
import type { Storyboard } from "../storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { ReactNode } from "react";

/** A storyboard film whose product shots render real Avandar components. */
export function ProductFilm({
  plan,
  theme,
}: {
  plan: Storyboard;
  theme?: VideoThemeSnapshot;
}): ReactNode {
  return (
    <ThemedStoryFilm plan={plan} theme={theme} productScene={AvandarScene} />
  );
}
