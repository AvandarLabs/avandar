import { SketchedShape } from "../../../primitives/SketchedShape";
import { ServiceEnclosureBody } from "./ServiceEnclosureBody";
import { ServiceModuleLatch } from "./ServiceModuleLatch";
import { useServiceEnclosurePresentation } from "./useServiceEnclosurePresentation";
import type { getServiceSceneFromFrame } from "../getServiceSceneFromFrame";
import type { Input } from "../ServiceablePanelSwap.schema.ts";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getServiceSceneFromFrame>;
};
/**
 * Stable enclosure and actual opening seam around the chosen fixed connector.
 */
export function ServiceEnclosure(props: Readonly<Props>): ReactNode {
  const presentation = useServiceEnclosurePresentation(props);

  return (
    <g>
      <ServiceEnclosureBody {...presentation} />
      <rect
        data-connector="true"
        x={props.scene.slotX + 68}
        y={218}
        width={6}
        height={30}
        fill={presentation.tokens.color.accentAlt}
      />
      <ServiceModuleLatch {...presentation} />
      {props.input.showConnectorGuide ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${props.scene.slotX + 71} 252 V400` }}
          profile={presentation.tokens.sketch.shape}
          data-connector-guide="true"
          stroke={presentation.tokens.color.accentAlt}
          strokeDasharray={presentation.tokens.dash.guide.join(" ")}
        />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "path", d: "M48 420 v138 h160 V420" }}
        profile={presentation.tokens.sketch.shape}
        data-retained-tray="true"
        fill="none"
        stroke={presentation.tokens.color.highlight}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.default,
        )}
      />
    </g>
  );
}
