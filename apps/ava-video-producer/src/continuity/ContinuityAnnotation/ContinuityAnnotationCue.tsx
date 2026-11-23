import {
  Box,
  Bracket,
  Circle,
  Highlight,
  Underline,
} from "@remotion/rough-notation";
import css from "./ContinuityAnnotation.module.css";
import type { ProductAnnotation } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

const NOTATION = {
  box: Box,
  bracket: Bracket,
  circle: Circle,
  highlight: Highlight,
  underline: Underline,
};
type Props = {
  cue: ProductAnnotation;
  progress: number;
  accent: string;
  roughness: number;
  strokeWidth: number;
  highlightAlpha: number;
};
/** Draws one measured annotation with its resolved stroke appearance. */
export function ContinuityAnnotationCue({
  cue,
  progress,
  accent,
  roughness,
  strokeWidth,
  highlightAlpha,
}: Readonly<Props>): ReactNode {
  const Annotation = NOTATION[cue.kind];
  return (
    <div
      className={css.continuityAnnotationRoot}
      style={{
        left: cue.target.x,
        top: cue.target.y,
        opacity: cue.kind === "highlight" ? highlightAlpha : 1,
      }}
    >
      <Annotation
        progress={progress}
        color={accent}
        roughness={roughness}
        seed={cue.seed}
        strokeWidth={strokeWidth}
      >
        <div style={{ width: cue.target.width, height: cue.target.height }} />
      </Annotation>
    </div>
  );
}
