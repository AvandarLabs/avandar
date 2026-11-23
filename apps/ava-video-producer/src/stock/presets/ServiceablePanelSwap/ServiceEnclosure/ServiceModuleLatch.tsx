import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useServiceEnclosurePresentation } from "./useServiceEnclosurePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useServiceEnclosurePresentation>,
  "scene" | "tokens" | "scales"
>;
/** Render the service module latch. */
export function ServiceModuleLatch(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${props.scene.slotX - 8} 365 V${223 - 38 * props.scene.latchOpen} H${props.scene.slotX + 144} V365`,
      }}
      profile={props.tokens.sketch.shape}
      data-service-latch="true"
      fill="none"
      stroke={props.tokens.color.highlight}
      strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
    />
  );
}
