import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SourceContextComparison } from "./SourceContextComparison";
import type { Input } from "../ChargeReferenceAlignment.schema";
import type { CONTEXT_FIELDS } from "../CONTEXT_FIELDS.constants";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  field: (typeof CONTEXT_FIELDS)[number][0];
  copyKey: (typeof CONTEXT_FIELDS)[number][1];
  index: number;
  registration: number;
  accent: string;
};

/** One exact context pair with a persistent notch for a mismatch. */
export function ContextWindow({
  input,
  field,
  copyKey,
  index,
  registration,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const y = 130 + 42 * index;
  const isMatched = input.invoice[field] === input.reference[field];
  const referenceY =
    y +
    Motion.mix({
      t: registration,
      from: 15,
      to: isMatched ? 0 : 8,
    });
  return (
    <g key={field} data-context-field={field} data-context-match={isMatched}>
      <LabelSlots labels={[[input.copy[copyKey], 30, y + 13, 205, 12, 2]]} />
      <SourceContextComparison
        input={input}
        field={field}
        accent={accent}
        tokens={tokens}
        y={y}
        isMatched={isMatched}
        referenceY={referenceY}
      />
    </g>
  );
}
