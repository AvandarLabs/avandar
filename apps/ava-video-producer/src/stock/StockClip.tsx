import { useCurrentFrame } from "remotion";
import { VideoThemeProvider } from "../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createVideoThemeSourceFromSnapshot } from "../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { StockGraphic } from "./StockGraphic/StockGraphic";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { StockRequest } from "./contracts/StockContract.types";
import type { ReactNode } from "react";

/** A stock request and the theme the `motion` CLI renders it in. */
export type Props = StockRequest & { theme?: VideoThemeSnapshot };

/**
 * Standalone composition picture shares the gallery's validated SVG renderer.
 */
export function StockClip({ theme, ...request }: Props): ReactNode {
  return (
    <VideoThemeProvider
      source={createVideoThemeSourceFromSnapshot(theme, [request.preset])}
      element="none"
    >
      <StockGraphic
        {...request}
        frame={useCurrentFrame()}
        width={1280}
        height={800}
      />
    </VideoThemeProvider>
  );
}
