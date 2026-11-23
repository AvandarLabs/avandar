import { SketchedShape } from "../../primitives/SketchedShape";
import { WorkPiece } from "./WorkPiece/WorkPiece";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  pieces: ReturnType<typeof getWorkPartitionFromInput>;
};

/** Renders the work slab brackets in authored paint order. */
export function WorkSlabBrackets(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M66 222 V206 H614 V222 M66 508 V524 H614 V508",
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.line}
        fill="none"
      />
      <g
        opacity={options.motion.ramp(
          options.frame,
          38,
          options.motion.scale(2),
        )}
      >
        {options.pieces.map((piece, index) => {
          return (
            <WorkPiece
              key={piece.id}
              piece={piece}
              index={index}
              frame={options.frame}
              accent={options.accent}
              parentLabel={options.input.parentLabel}
              showEffortValues={options.input.showEffortValues}
            />
          );
        })}
      </g>
    </>
  );
}
