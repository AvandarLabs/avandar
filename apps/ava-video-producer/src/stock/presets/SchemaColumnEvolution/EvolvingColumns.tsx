import { EvolutionHeader } from "./EvolutionHeader";
import { EvolutionRow } from "./EvolutionRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

/** Frame-driven complete authored schema extension. */
export type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  expansion: number;
  x: number;
};

/** Renders the evolving columns in authored paint order. */
export function EvolvingColumns(options: Readonly<Props>): ReactNode {
  return (
    <>
      <EvolutionHeader
        input={options.input}
        x={options.x}
        expansion={options.expansion}
        accent={options.accent}
      />
      {options.input.earlierRecords.map((record, index) => {
        return (
          <EvolutionRow
            key={record.id}
            record={record}
            x={options.x}
            y={220 + index * 65}
            accent={options.accent}
            expansion={options.expansion}
            missingLabel={options.input.fields.missingLabel}
            missingOpacity={options.motion.ramp(
              options.frame,
              49 + index * options.motion.scaleStagger(6),
              options.motion.scale(31),
            )}
          />
        );
      })}
    </>
  );
}
