import { useVideoTheme, useVideoTokens } from "../../videoTheme/useVideoTheme";
import { Orb } from "../Orb/Orb";
import { AppFrameShared } from "./AppFrameShared/AppFrameShared";
import { AppHeaderTitles } from "./AppHeaderTitles";
import type { ReactNode } from "react";

type Props = { w: number; heading: string; sub: string; rule: string };
/** The app header under the title bar: the orb, a heading, and a subline. */
export function AppHeader({
  w,
  heading,
  sub,
  rule,
}: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const scene = tokens.color.scene;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: AppFrameShared.BAR,
        width: w,
        height: AppFrameShared.HEAD,
        display: "flex",
        alignItems: "center",
        gap: spacing["12"],
        padding: `0 ${spacing["24"]}`,
        borderBottom: rule,
        background: scene.background,
        fontFamily: tokens.text.stage.appTitle.fontFamily,
        color: scene.foreground,
      }}
    >
      <Orb />
      <AppHeaderTitles heading={heading} sub={sub} />
    </div>
  );
}
