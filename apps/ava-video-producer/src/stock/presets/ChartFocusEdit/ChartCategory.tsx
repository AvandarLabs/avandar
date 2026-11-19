import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CategoryContext } from "./CategoryContext";
import { CategoryLabel } from "./CategoryLabel";
import { getRefinementFromFrame } from "./getRefinementFromFrame";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";

type Props = {
  category: Input["categories"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/** The opacity a bar out of focus dims to. */
const UNFOCUSED_OPACITY = 0.35;
/** A bar's corner before the corner style scales it. */
const BAR_CORNER = 2;
/**
 * An unchanging quantitative bar with independently moving editorial labels.
 */
export function ChartCategory({
  category,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const refinement = getRefinementFromFrame(frame, motion);
  const direct = input.treatment !== "focus" ? refinement : 0;
  const emphasized =
    input.treatment !== "direct-labels" && category.id !== input.focusId;
  const y = 174 + index * 72;
  return (
    <g opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}>
      {input.showBeforeGuide ? (
        <g data-before-guide={category.id}>
          <SketchedShape
            shape={{ kind: "path", d: `M20 ${y + 29}H332` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
            strokeDasharray={tokens.dash.guide.join(" ")}
            opacity={refinement * tokens.alpha.dimmed}
          />
        </g>
      ) : undefined}
      <g
        data-bar-emphasis={category.id}
        opacity={emphasized ? mix(refinement, 1, UNFOCUSED_OPACITY) : 1}
      >
        <rect
          data-chart-bar={category.id}
          x={344}
          y={y}
          width={(category.value / input.axisMaximum) * 400}
          height={20}
          rx={scales.corner(BAR_CORNER)}
          fill={accent}
        />
      </g>
      <CategoryLabel category={category} direct={direct} y={y} />
      <CategoryContext
        category={category}
        input={input}
        y={y}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
