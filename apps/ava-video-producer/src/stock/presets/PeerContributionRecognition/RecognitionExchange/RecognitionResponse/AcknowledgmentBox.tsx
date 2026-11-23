import { StockRect } from "../../../../primitives/StockRect";
import type { useRecognitionExchangePresentation } from "../useRecognitionExchangePresentation";
import type { ReactNode } from "react";
/** A spoken acknowledgment's corner before the corner style scales it. */
const SPOKEN_CORNER = 20;
/** A written acknowledgment's corner before the corner style scales it. */
const WRITTEN_CORNER = 2;
type Props = Pick<
  ReturnType<typeof useRecognitionExchangePresentation>,
  "scales" | "input" | "peer" | "tokens"
>;
/** Render the acknowledgment box. */
export function AcknowledgmentBox(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-acknowledgment-box="true"
      x={310}
      y={30}
      width={590}
      height={90}
      rx={props.scales.corner(
        props.input.acknowledgment.form === "spoken"
          ? SPOKEN_CORNER
          : WRITTEN_CORNER,
      )}
      stroke={props.peer}
      fill={props.tokens.color.surface}
    />
  );
}
