import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ConflictCandidatePanelCornerValue } from "../ConflictCandidate";
import type { Input } from "../FieldConflictChoice.schema";
import type { getConflictCandidateStateFromField } from "../getConflictCandidateStateFromField";
import type { ReactNode } from "react";

type Props = {
  source: Input["sources"][number];
  field: Input["fields"][number];
  isChosen: ReturnType<typeof getConflictCandidateStateFromField>["isChosen"];
  progress: number;
  value: ReturnType<typeof getConflictCandidateStateFromField>["value"];
  x: ReturnType<typeof getConflictCandidateStateFromField>["x"];
  top: ReturnType<typeof getConflictCandidateStateFromField>["top"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  panelCorner: ConflictCandidatePanelCornerValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
};

/** Renders the candidate source with authored geometry. */
export function ConflictCandidateSurface({
  source,
  field,
  isChosen,
  progress,
  value,
  x,
  top,
  scales,
  panelCorner: PANEL_CORNER,
  tokens,
  accent,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
