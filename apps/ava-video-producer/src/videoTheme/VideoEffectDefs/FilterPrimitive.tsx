import { match } from "ts-pattern";
import { GlowEffect } from "./GlowEffect";
import type { EffectPrimitive } from "../VideoEffectFilters/VideoEffectFilters";
import type { ReactNode } from "react";

type Props = Readonly<{
  primitive: EffectPrimitive;
  /** The filter result this step reads, such as `SourceGraphic` or `fx0`. */
  input: string;
  /** The filter result this step writes, which the next step reads. */
  result: string;
}>;

/**
 * Renders one SVG filter primitive inside a `VideoEffectDefs` `<filter>` chain.
 */
export function FilterPrimitive({
  primitive,
  input,
  result,
}: Props): ReactNode {
  return match(primitive)
    .with({ kind: "dropShadow" }, (matchedPrimitive) => {
      return (
        <feDropShadow
          dx={matchedPrimitive.dx}
          dy={matchedPrimitive.dy}
          stdDeviation={matchedPrimitive.stdDeviation}
          floodColor={matchedPrimitive.color}
          floodOpacity={matchedPrimitive.opacity}
          in={input}
          result={result}
        />
      );
    })
    .with({ kind: "blur" }, (matchedPrimitive) => {
      return (
        <feGaussianBlur
          in={input}
          stdDeviation={matchedPrimitive.stdDeviation}
          result={result}
        />
      );
    })
    .with({ kind: "glow" }, (matchedPrimitive) => {
      return (
        <GlowEffect
          primitive={matchedPrimitive}
          input={input}
          result={result}
        />
      );
    })
    .exhaustive();
}
