import {
  buildEffectFilterId,
  type EffectPrimitive,
  type VideoEffectFilter,
} from "../videoEffectFilterHelpers/videoEffectFilterHelpers";
import { FilterPrimitive } from "./FilterPrimitive";
import type { ReactNode } from "react";

type Props = Readonly<{
  graphicId: string;
  filters: readonly VideoEffectFilter[];
}>;

type KeyedPrimitive = {
  key: string;
  primitive: EffectPrimitive;
  input: string;
  result: string;
};

function _buildKeyedPrimitives(
  primitives: readonly EffectPrimitive[],
): KeyedPrimitive[] {
  const primitiveKindCounts = new Map<string, number>();
  return primitives.map((primitive, stepOffset) => {
    const occurrence = primitiveKindCounts.get(primitive.kind) ?? 0;
    primitiveKindCounts.set(primitive.kind, occurrence + 1);
    return {
      key: `${primitive.kind}-${occurrence}`,
      primitive,
      input: stepOffset === 0 ? "SourceGraphic" : `fx${stepOffset - 1}`,
      result: `fx${stepOffset}`,
    };
  });
}

/**
 * One SVG `<defs>` holding the filters a stock graphic's theme defines, each
 * under `buildEffectFilterId(graphicId, tokenPath)`. Renders nothing when the
 * theme defines none. Steps chain in order, so a glow wraps a drop shadow.
 */
export function VideoEffectDefs({ graphicId, filters }: Props): ReactNode {
  if (filters.length === 0) {
    return null;
  }
  return (
    <defs>
      {filters.map((filter) => {
        return (
          <filter
            key={filter.path}
            id={buildEffectFilterId(graphicId, filter.path)}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            {_buildKeyedPrimitives(filter.primitives).map((step) => {
              return (
                <FilterPrimitive
                  key={step.key}
                  primitive={step.primitive}
                  input={step.input}
                  result={step.result}
                />
              );
            })}
          </filter>
        );
      })}
    </defs>
  );
}
