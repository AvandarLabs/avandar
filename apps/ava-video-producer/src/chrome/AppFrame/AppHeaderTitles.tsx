import { StageTheme } from "../../scenes/StageTheme/StageTheme";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import type { CSSProperties, ReactNode } from "react";

type Props = { heading: string; sub: string };

/** The header's heading over its subline. */
export function AppHeaderTitles({ heading, sub }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  return (
    <div>
      <div
        style={StageTheme.getStageTextStyle({
          role: tokens.text.stage.appTitle,
          fields: ["fontSize", "fontWeight", "color"],
        })}
      >
        {heading}
      </div>
      <div
        style={StageTheme.getStageTextStyle({
          role: tokens.text.stage.appBody,
          fields: ["fontSize", "fontWeight", "color"],
        })}
      >
        {sub}
      </div>
    </div>
  );
}
