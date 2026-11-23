import { StockRect } from "../../../primitives/StockRect";
import { InstalledModelCartridge } from "./InstalledModelCartridge";
import { useModelCartridgePresentation } from "./useModelCartridgePresentation";
import type { Input } from "../PocketInference.schema.ts";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The closed cartridge's corner, before the theme's corner style. */
const CARTRIDGE_CORNER = 16;
/**
 * The resident model seats entirely inside the casing before the single
 * inference ripple.
 */
export function ModelCartridge(props: Readonly<Props>): ReactNode {
  const presentation = useModelCartridgePresentation(props);

  return (
    <g>
      <StockRect
        data-model-socket={props.input.showCutaway ? "cutaway" : "screen-inset"}
        x={194}
        y={122}
        width={572}
        height={88}
        rx={presentation.scales.corner(
          props.input.showCutaway
            ? presentation.tokens.corner.chip
            : CARTRIDGE_CORNER,
        )}
        fill={presentation.tokens.color.ground}
        stroke={presentation.tokens.color.line}
        strokeDasharray={
          props.input.showCutaway
            ? presentation.atomic.dash.medium.join(" ")
            : undefined
        }
      />
      <InstalledModelCartridge {...presentation} />
    </g>
  );
}
