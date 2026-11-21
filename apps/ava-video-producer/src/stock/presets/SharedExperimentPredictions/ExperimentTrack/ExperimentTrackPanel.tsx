import { StockRect } from "../../../primitives/StockRect";
import type { useExperimentTrackPresentation } from "./useExperimentTrackPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useExperimentTrackPresentation>,
  "scales" | "tokens" | "atomic"
>;
/** Render the experiment track panel. */
export function ExperimentTrackPanel(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={390}
      y={130}
      width={540}
      height={390}
      rx={props.scales.corner(15)}
      fill={props.tokens.color.surface}
      fillOpacity={props.scales.wash(props.atomic.opacity["30"])}
      stroke={props.tokens.color.line}
    />
  );
}
