import { ThemedStoryFilm } from "../storyboard/ThemedStoryFilm";
import { AvandarScene } from "./AvandarScene/AvandarScene";
import type { Storyboard } from "../storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { ReactNode } from "react";

type Props = {
  plan: Storyboard;
  theme?: VideoThemeSnapshot;
};

/** A storyboard film whose product shots render real Avandar components. */
export function ProductFilm({ plan, theme }: Readonly<Props>): ReactNode {
  return (
    <ThemedStoryFilm plan={plan} theme={theme} productScene={AvandarScene} />
  );
}
