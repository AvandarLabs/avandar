import { FitText } from "../../primitives/FitText/FitText";
import type { useSharedJigPreparationPresentation } from "./useSharedJigPreparationPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSharedJigPreparationPresentation>,
  "input" | "scene" | "tokens"
>;
/** Render the jig maker label. */
export function JigMakerLabel(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={props.input.makerLabel}
      x={Math.min(610, props.scene.guideX - 40)}
      y={550}
      width={300}
      fontSize={12}
      maxLines={2}
      color={props.tokens.color.highlight}
      normalizeWhitespace
      breakLongWords
    />
  );
}
