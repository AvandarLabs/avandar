import { FitText } from "../../../primitives/FitText/FitText";
import type { useUncertaintyAxisPresentation } from "./useUncertaintyAxisPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useUncertaintyAxisPresentation>,
  "input" | "tokens"
>;
/** Render the uncertainty axis maximum. */
export function UncertaintyAxisMaximum(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={String(props.input.axis.max)}
      x={860}
      y={238}
      width={200}
      fontSize={12}
      maxLines={2}
      anchor="end"
      breakLongWords
      normalizeWhitespace
      color={props.tokens.color.textMuted}
    />
  );
}
