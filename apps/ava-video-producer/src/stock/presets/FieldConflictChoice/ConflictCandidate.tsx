import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ConflictCandidateCopy } from "./ConflictCandidateCopy";
import { getConflictCandidateStateFromField } from "./getConflictCandidateStateFromField";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  sourceIndex: number;
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
  accent: string;
};
/** A candidate panel's corner before the corner style scales it. */
const PANEL_CORNER = 5;
/** A source value remains literal as its panel lifts into its chosen lane. */
export function ConflictCandidate({
  source,
  sourceIndex,
  field,
  input,
  y,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { value, isChosen, isResolved, isHidden, x, top, opacity } =
    getConflictCandidateStateFromField({
      source,
      sourceIndex,
      field,
      input,
      y,
      progress,
    });
  if (isHidden) {
    return undefined;
  }
  return (
    <g opacity={opacity}>
      <StockRect
        data-candidate-source={source.id}
        data-field={field.id}
        data-result-field={isChosen && progress === 1 ? field.id : undefined}
        data-result-value={isChosen && progress === 1 ? value : undefined}
        x={x}
        y={top}
        width={416}
        height={66}
        rx={scales.corner(PANEL_CORNER)}
        fill={tokens.color.surface}
        stroke={isChosen ? accent : tokens.color.line}
      />
      <ConflictCandidateCopy
        sourceLabel={source.label}
        value={value}
        labels={input.labels}
        x={x}
        top={top}
        isChosen={isChosen}
        isResolved={isResolved}
        progress={progress}
      />
    </g>
  );
}
