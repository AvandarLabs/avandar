import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SourceContextCell } from "./SourceContextCell";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { CONTEXT_FIELDS } from "./CONTEXT_FIELDS.constants";
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
  const referenceY = y + mix(registration, 15, isMatched ? 0 : 8);
  return (
    <g key={field} data-context-field={field} data-context-match={isMatched}>
      <LabelSlots labels={[[input.copy[copyKey], 30, y + 13, 205, 12, 2]]} />
      <SourceContextCell
        field={field}
        x={250}
        y={y}
        value={String(input.invoice[field])}
        stroke={input.focus === "keys" ? accent : tokens.color.line}
      />
      <SourceContextCell
        field={field}
        x={600}
        y={referenceY}
        value={String(input.reference[field])}
        stroke={isMatched ? tokens.color.accentAlt : tokens.color.highlight}
        isReference
      />
      {!isMatched ? (
        <SketchedShape
          shape={{ kind: "path", d: `M582 ${y + 3} h6 v8 h-6` }}
          profile={tokens.sketch.shape}
          data-mismatch-notch={field}
          stroke={tokens.color.highlight}
          fill="none"
        />
      ) : null}
    </g>
  );
}
