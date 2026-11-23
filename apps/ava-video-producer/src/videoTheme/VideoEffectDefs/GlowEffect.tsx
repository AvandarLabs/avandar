import type { EffectPrimitive } from "../VideoEffectFilters/VideoEffectFilters";
import type { ReactNode } from "react";

type Props = Readonly<{
  primitive: Extract<EffectPrimitive, { kind: "glow" }>;
  /** The filter result this step reads, such as `SourceGraphic` or `fx0`. */
  input: string;
  /** The filter result this step writes, which the next step reads. */
  result: string;
}>;

/**
 * The SVG filter primitives of a glow step: a blurred, flooded copy of the
 * source alpha merged under the input. Render it inside a `<filter>`, since
 * filter primitives are order sensitive.
 */
export function GlowEffect({ primitive, input, result }: Props): ReactNode {
  return (
    <>
      <feGaussianBlur
        in="SourceAlpha"
        stdDeviation={primitive.stdDeviation}
        result={`${result}-blur`}
      />
      <feFlood
        floodColor={primitive.color}
        floodOpacity={primitive.opacity}
        result={`${result}-flood`}
      />
      <feComposite
        in={`${result}-flood`}
        in2={`${result}-blur`}
        operator="in"
        result={`${result}-glow`}
      />
      <feMerge result={result}>
        <feMergeNode in={`${result}-glow`} />
        <feMergeNode in={input} />
      </feMerge>
    </>
  );
}
