import { getStageTextStyle } from "../scenes/stageTheme/stageTheme";
import { StageThemeBoundary } from "../scenes/stageTheme/StageThemeBoundary";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import { Orb } from "./Orb";
import type { CSSProperties, ReactNode } from "react";

export const BAR = 40;
export const HEAD = 68;
export const BODY_Y = BAR + HEAD;

/** Diameter of a title bar window dot, in pixels. */
const DOT_SIZE = 8;

type Props = {
  w: number;
  title: string;
  heading: string;
  sub: string;
};

/** Title bar + header as one unit. Static for the whole clip: a constant
 *  surface is what makes the loop seam free. The frame the clip restarts
 *  on is the frame it ended on, so there is no full-frame luminance jump.
 *  Surfaces come from the scene palette, type from `text.stage.appTitle`
 *  and `text.stage.appBody`. */
export function AppFrame(props: Props): ReactNode {
  return (
    <StageThemeBoundary>
      <_AppFrame {...props} />
    </StageThemeBoundary>
  );
}

function _AppFrame({ w, title, heading, sub }: Props): ReactNode {
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const appBody = tokens.text.stage.appBody;
  const rule = `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`;
  const dot: CSSProperties = {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: scales.corner(tokens.corner.pill),
    background: scene.border,
    display: "block",
  };
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: BAR,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          borderBottom: rule,
          background: scene.background,
          ...getStageTextStyle(appBody),
        }}
      >
        <i style={dot} />
        <i style={dot} />
        <i style={dot} />
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: BAR,
          width: w,
          height: HEAD,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          borderBottom: rule,
          background: scene.background,
          fontFamily: tokens.text.stage.appTitle.fontFamily,
          color: scene.foreground,
        }}
      >
        <Orb />
        <div>
          <div
            style={getStageTextStyle(tokens.text.stage.appTitle, [
              "fontSize",
              "fontWeight",
              "color",
            ])}
          >
            {heading}
          </div>
          <div
            style={getStageTextStyle(appBody, [
              "fontSize",
              "fontWeight",
              "color",
            ])}
          >
            {sub}
          </div>
        </div>
      </div>
    </>
  );
}
