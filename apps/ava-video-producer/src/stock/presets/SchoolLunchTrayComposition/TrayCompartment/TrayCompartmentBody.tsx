import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import type { useTrayCompartmentPresentation } from "./useTrayCompartmentPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useTrayCompartmentPresentation>,
  "scales" | "tokens" | "outlineEmphasis"
>;
/** Render the tray compartment body. */
export function TrayCompartmentBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={-65}
      y={0}
      width={130}
      height={70}
      rx={props.scales.corner(props.tokens.corner.cell)}
      fill={props.tokens.color.surface}
      stroke={props.tokens.color.line}
      strokeWidth={props.scales.stroke(
        Motion.mix({
          t: props.outlineEmphasis,
          from: props.tokens.stroke.hairline,
          to: props.tokens.stroke.default,
        }),
      )}
    />
  );
}
