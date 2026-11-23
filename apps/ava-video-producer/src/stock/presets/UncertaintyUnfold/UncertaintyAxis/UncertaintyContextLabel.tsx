import { FitText } from "../../../primitives/FitText/FitText";
import type { useUncertaintyAxisPresentation } from "./useUncertaintyAxisPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useUncertaintyAxisPresentation>,
  "input" | "tokens"
>;
/** Render the uncertainty context label. */
export function UncertaintyContextLabel(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={props.input.contextLabel}
      x={100}
      y={56}
      width={760}
      fontSize={14}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
      color={props.tokens.color.textMuted}
    />
  );
}
