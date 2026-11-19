import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getServiceSceneFromFrame } from "./getServiceSceneFromFrame";
import type { Input } from "./ServiceablePanelSwap.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getServiceSceneFromFrame>;
};
/**
 * Stable enclosure and actual opening seam around the chosen fixed connector.
 */
export function ServiceEnclosure({ input, scene }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-enclosure={input.enclosure}
        x={160}
        y={205}
        width={input.modules.length * 170 - 10}
        height={174}
        rx={input.enclosure === "console" ? 18 : 2}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <rect
        data-connector="true"
        x={scene.slotX + 68}
        y={218}
        width={6}
        height={30}
        fill={tokens.color.accentAlt}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${scene.slotX - 8} 365 V${223 - 38 * scene.latchOpen} H${scene.slotX + 144} V365`,
        }}
        profile={tokens.sketch.shape}
        data-service-latch="true"
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {input.showConnectorGuide ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${scene.slotX + 71} 252 V400` }}
          profile={tokens.sketch.shape}
          data-connector-guide="true"
          stroke={tokens.color.accentAlt}
          strokeDasharray={tokens.dash.guide.join(" ")}
        />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "path", d: "M48 420 v138 h160 V420" }}
        profile={tokens.sketch.shape}
        data-retained-tray="true"
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
