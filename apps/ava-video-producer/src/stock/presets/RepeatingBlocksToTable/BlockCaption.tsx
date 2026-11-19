import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  heading: string;
  index: number;
  x: number;
  y: number;
  opacity: number;
  width: number;
  showBlockNumbers: boolean;
  accent: string;
};
/** A readable block heading and optional ordinal stay keyed by their color. */
export function BlockCaption({
  heading,
  index,
  x,
  y,
  opacity,
  width,
  showBlockNumbers,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g opacity={opacity}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y + 37} h${width}` }}
        profile={tokens.sketch.shape}
        stroke={accent}
      />
      <LabelSlots labels={[[heading, x + 30, y, 190, 12, 3]]} />
      {showBlockNumbers ? (
        <text
          data-block-number={index + 1}
          x={x + 4}
          y={y}
          fill={tokens.color.textMuted}
          fontSize={tokens.text.graphic.eyebrow.fontSize}
        >
          {index + 1}
        </text>
      ) : undefined}
    </g>
  );
}
