import { StockRect } from "../../../../primitives/StockRect";
import type { getRecognitionObjectLayout } from "./getRecognitionObjectLayout";
import type { ReactNode } from "react";
/** A repair object's rounded corner before the corner style scales it. */
const REPAIR_CORNER = 24;
type Props = Pick<
  ReturnType<typeof getRecognitionObjectLayout>,
  "focused" | "item" | "x" | "scales" | "tokens" | "accent" | "lineWidth"
>;
/** Render the recognition object body. */
export function RecognitionObjectBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-focused-object={props.focused ? props.item.id : undefined}
      x={props.x}
      y={230}
      width={160}
      height={100}
      rx={props.scales.corner(
        props.item.artifact === "repair"
          ? REPAIR_CORNER
          : props.tokens.corner.chip,
      )}
      stroke={props.focused ? props.accent : props.tokens.color.line}
      strokeWidth={props.lineWidth}
      fill={props.tokens.color.surface}
    />
  );
}
