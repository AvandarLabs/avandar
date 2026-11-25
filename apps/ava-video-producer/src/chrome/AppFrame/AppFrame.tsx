import { StageThemeBoundary } from "../../scenes/StageTheme/StageThemeBoundary";
import { AppFrameContent } from "./AppFrameContent";
import { AppFrameShared } from "./AppFrameShared/AppFrameShared";
import { type Props } from "./AppFrameShared/AppFrameShared.types";
import type { ReactNode } from "react";

/** Vertical offset of the app body below the title and header bars. */
export const BODY_Y = AppFrameShared.BAR + AppFrameShared.HEAD;
/**
 * Title bar + header as one unit. Static for the whole clip: a constant
 * surface is what makes the loop seam free. The frame the clip restarts
 * on is the frame it ended on, so there is no full-frame luminance jump.
 * Surfaces come from the scene palette, type from `text.stage.appTitle`
 * and `text.stage.appBody`.
 */
export function AppFrame({
  w: propsW,
  title: propsTitle,
  heading: propsHeading,
  sub: propsSub,
}: Props): ReactNode {
  return (
    <StageThemeBoundary>
      <AppFrameContent
        {...{
          w: propsW,
          title: propsTitle,
          heading: propsHeading,
          sub: propsSub,
        }}
      />
    </StageThemeBoundary>
  );
}
