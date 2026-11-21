import { StageTheme } from "../../StageTheme/StageTheme";
import css from "./SceneKicker.module.css";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { SceneBase } from "../../scenes.types";
import type { TextReveal } from "../../TextReveal/TextReveal";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  kicker: SceneBase["kicker"];
  body: ReturnType<typeof useVideoTokens>["text"]["stage"]["sceneBody"];
  lineBox: CSSProperties;
  reveal: ReturnType<typeof TextReveal.getHeadingRevealStyles>;
};
/** Renders scene kicker. */
export function SceneKicker({
  tokens,
  spacing,
  kicker,
  body,
  lineBox,
  reveal,
}: Readonly<Props>): ReactNode {
  return (
    <p
      className={css.sceneKickerp1}
      style={{
        margin: `${spacing["2xs"]} 0 0`,
        ...StageTheme.getStageTextStyle({
          role: body,
          fields: ["fontSize", "lineHeight"],
        }),
        color: tokens.color.scene.mutedForeground,
      }}
    >
      <span style={{ ...lineBox, ...reveal.kicker }}>{kicker}</span>
    </p>
  );
}
