import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** One fixed axis owns all record and investigation-window bounds. */
export function PresenceAxis({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <SceneLabel
        text={input.investigationWindow.label}
        x={350}
        y={125}
        width={530}
        lines={2}
      />
      <SceneLabel
        text={input.axis.unitLabel}
        x={32}
        y={160}
        width={240}
        lines={3}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M280 180 H910" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
      />
      <text
        x={280}
        y={170}
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {input.axis.start}
      </text>
      <text
        x={910}
        y={170}
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        textAnchor="end"
      >
        {input.axis.end}
      </text>
    </g>
  );
}
