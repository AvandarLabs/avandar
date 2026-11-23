import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ConflictCandidateCopy } from "./ConflictCandidateCopy";
import { ConflictCandidateSurface } from "./ConflictCandidateSurface/ConflictCandidateSurface";
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
      <ConflictCandidateSurface
        {...{ source, field, isChosen, progress, value, x, top }}
        scales={scales}
        panelCorner={PANEL_CORNER}
        tokens={tokens}
        accent={accent}
      />
      <ConflictCandidateCopy
        sourceLabel={source.label}
        value={value}
        labels={input.labels}
        {...{ x, top, isChosen, isResolved, progress }}
      />
    </g>
  );
}

/** The type of `PANEL_CORNER` used by ConflictCandidate. */
export type ConflictCandidatePanelCornerValue = typeof PANEL_CORNER;
