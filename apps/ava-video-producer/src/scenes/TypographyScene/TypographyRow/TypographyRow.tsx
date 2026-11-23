import { TextReveal } from "../../TextReveal/TextReveal";
import { TypographyLine } from "../TypographyLine";
import css from "./TypographyRow.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { TextLayout } from "../../layout/TextLayout";
import type { TypographySceneProps as SceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  props: SceneProps;
  motion: ReturnType<typeof useVideoMotion>;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  isCaption: boolean;
  isCentered: boolean;
  wordStaggerFrames: number;
  linesAt: number;
  wordStarts: number[];
  line: string;
  row: number;
};
/** Renders typography row. */
export function TypographyRow({
  frame,
  props,
  motion,
  fitted,
  isCaption,
  isCentered,
  wordStaggerFrames,
  linesAt,
  wordStarts,
  line,
  row,
}: Readonly<Props>): ReactNode {
  return (
    <div
      key={row}
      className={css.typographyRowdiv1}
      style={{
        ...TextReveal.getStagedExitStyle({
          frame,
          exit: props.exit,
          orderIndex: row,
          motion,
        }),
      }}
    >
      <TypographyLine
        {...props}
        line={line}
        fontSize={fitted.fontSize}
        isCaption={isCaption}
        isCentered={isCentered}
        revealAt={
          props.revealMode === undefined || props.revealMode === "word-mask"
            ? linesAt + wordStarts[row] * wordStaggerFrames
            : linesAt + row * (props.lineStaggerFrames ?? motion.rise.stagger)
        }
      />
    </div>
  );
}
