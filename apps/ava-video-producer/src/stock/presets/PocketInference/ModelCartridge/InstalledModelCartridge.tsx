import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { CartridgeText } from "../CartridgeText/CartridgeText";
import type { useModelCartridgePresentation } from "./useModelCartridgePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useModelCartridgePresentation>,
  | "frame"
  | "input"
  | "accent"
  | "atomic"
  | "tokens"
  | "motion"
  | "scales"
  | "y"
  | "ripple"
>;
/** Render the installed model cartridge. */
export function InstalledModelCartridge(props: Readonly<Props>): ReactNode {
  return (
    <g
      data-cartridge-installation="local"
      opacity={props.motion.ramp(props.frame, 20, props.motion.chip)}
    >
      <StockRect
        data-model-cartridge="resident"
        x={202}
        y={props.y}
        width={556}
        height={72}
        rx={props.scales.corner(6)}
        fill={props.tokens.color.elevated}
        stroke={props.accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M214 ${props.y + 62} h532` }}
        profile={props.tokens.sketch.shape}
        stroke={props.accent}
        strokeOpacity={props.tokens.alpha.dimmed}
      />
      <CartridgeText {...{ input: props.input, y: props.y }} />
      {props.frame >= 56 && props.frame < 80 ? (
        <rect
          data-inference-ripple="single"
          x={Motion.mix({ t: props.ripple, from: 214, to: 738 })}
          y={props.y + 8}
          width={6}
          height={48}
          fill={props.accent}
          fillOpacity={
            props.atomic.opacity["30"] * Math.sin(props.ripple * Math.PI)
          }
        />
      ) : undefined}
    </g>
  );
}
