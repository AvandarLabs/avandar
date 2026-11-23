import { positioned } from "../../positioned";
import { TypographyIcon } from "../TypographyIcon/TypographyIcon";
import { TypographyRow } from "../TypographyRow/TypographyRow";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { TextLayout } from "../../layout/TextLayout";
import type { TypographySceneProps as SceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  props: SceneProps;
  lines: string[];
  bounds: Rect;
  motion: ReturnType<typeof useVideoMotion>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  icon: SceneProps["icon"];
  iconSize: number;
  iconAt: number;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  isCaption: boolean;
  isCentered: boolean;
  wordStaggerFrames: number;
  linesAt: number;
  wordStarts: number[];
};
/** Renders typography content. */
export function TypographyContent({
  lines,
  bounds,
  isCentered,
  fitted,
  icon,
  ...content
}: Readonly<Props>): ReactNode {
  return (
    <div
      aria-label={lines.join(" ")}
      style={{
        ...positioned(bounds),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: isCentered ? "center" : "flex-start",
        gap: fitted.fontSize * 0.15,
      }}
    >
      {icon ? (
        <TypographyIcon icon={icon} fitted={fitted} {...content} />
      ) : null}
      {fitted.lines.map((line, row) => {
        return (
          <TypographyRow
            key={row}
            {...content}
            {...{ fitted, isCentered, line, row }}
          />
        );
      })}
    </div>
  );
}
