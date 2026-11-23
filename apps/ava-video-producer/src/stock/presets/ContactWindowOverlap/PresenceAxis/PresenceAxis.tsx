import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneLabel } from "../SceneLabel";
import { AxisEndLabel } from "./AxisEndLabel";
import type { Input } from "../ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** One fixed axis owns all record and investigation-window bounds. */
export function PresenceAxis({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
      <AxisEndLabel x={280}>{input.axis.start}</AxisEndLabel>
      <AxisEndLabel x={910} anchor="end">
        {input.axis.end}
      </AxisEndLabel>
    </g>
  );
}
