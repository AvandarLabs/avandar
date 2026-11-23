import { StockRect } from "../../../primitives/StockRect";
import type { useServiceEnclosurePresentation } from "./useServiceEnclosurePresentation";
import type { ReactNode } from "react";
/** The cabinet's corner, before the theme's corner style. */
const CABINET_CORNER = 2;
type Props = Pick<
  ReturnType<typeof useServiceEnclosurePresentation>,
  "input" | "scales" | "tokens"
>;
/** Render the service enclosure body. */
export function ServiceEnclosureBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-enclosure={props.input.enclosure}
      x={160}
      y={205}
      width={props.input.modules.length * 170 - 10}
      height={174}
      rx={props.scales.corner(
        props.input.enclosure === "console"
          ? props.tokens.corner.panel
          : CABINET_CORNER,
      )}
      fill={props.tokens.color.elevated}
      stroke={props.tokens.color.line}
      strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
    />
  );
}
