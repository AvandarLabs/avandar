import { SketchedShape } from "../../../primitives/SketchedShape";
import { SourceContextCell } from "../SourceContextCell";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChargeReferenceAlignment.schema";
import type { CONTEXT_FIELDS } from "../CONTEXT_FIELDS.constants";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  field: (typeof CONTEXT_FIELDS)[number][0];
  copyKey: (typeof CONTEXT_FIELDS)[number][1];
  index: number;
  registration: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  field: Readonly<ParentProps>["field"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: number;
  isMatched: boolean;
  referenceY: number;
};

/** Renders the source context comparison in authored paint order. */
export function SourceContextComparison(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SourceContextCell
        field={options.field}
        x={250}
        y={options.y}
        value={String(options.input.invoice[options.field])}
        stroke={
          options.input.focus === "keys"
            ? options.accent
            : options.tokens.color.line
        }
      />
      <SourceContextCell
        field={options.field}
        x={600}
        y={options.referenceY}
        value={String(options.input.reference[options.field])}
        stroke={
          options.isMatched
            ? options.tokens.color.accentAlt
            : options.tokens.color.highlight
        }
        isReference
      />
      {!options.isMatched ? (
        <SketchedShape
          shape={{ kind: "path", d: `M582 ${options.y + 3} h6 v8 h-6` }}
          profile={options.tokens.sketch.shape}
          data-mismatch-notch={options.field}
          stroke={options.tokens.color.highlight}
          fill="none"
        />
      ) : null}
    </>
  );
}
