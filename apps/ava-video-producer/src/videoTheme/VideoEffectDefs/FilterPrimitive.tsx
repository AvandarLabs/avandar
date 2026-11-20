import { GlowEffect } from "./GlowEffect";
import type { EffectPrimitive } from "../videoEffectFilterHelpers/videoEffectFilterHelpers";
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
  if (primitive.kind === "dropShadow") {
    return (
      <feDropShadow
        dx={primitive.dx}
        dy={primitive.dy}
        stdDeviation={primitive.stdDeviation}
        floodColor={primitive.color}
        floodOpacity={primitive.opacity}
        in={input}
        result={result}
      />
    );
  }
  if (primitive.kind === "blur") {
    return (
      <feGaussianBlur
        in={input}
        stdDeviation={primitive.stdDeviation}
        result={result}
      />
    );
  }
  return <GlowEffect primitive={primitive} input={input} result={result} />;
}
