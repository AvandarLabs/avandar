import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CohortCount } from "./CohortCount";
import { CohortDots } from "./CohortDots";
import { CohortHeading } from "./CohortHeading";
import { CohortLegend } from "./CohortLegend";
import { getCohortGeometryFromInput } from "./getCohortGeometryFromInput";
import type { Props } from "./DotMatrix.types";
import type { ReactNode } from "react";

/** Renders the authored cohort study for StockGraphic at a given frame. */
export function DotMatrix(props: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const cohort = getCohortGeometryFromInput(props.input);
  const drawing = {
    ...props,
    atomic,
    color,
    stroke,
    alpha,
    sketch,
    shapes,
    motion,
    cohort,
  };
  return (
    <g>
      <CohortHeading {...drawing} />
      <CohortDots {...drawing} />
      <CohortCount {...drawing} />
      <CohortLegend {...drawing} />
    </g>
  );
}
