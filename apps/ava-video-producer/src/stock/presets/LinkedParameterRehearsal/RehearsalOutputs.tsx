import { RehearsalOutput } from "./RehearsalOutput";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { getRehearsalStateFromInputAndFrame } from "./getRehearsalStateFromInputAndFrame";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  value: ReturnType<typeof getRehearsalStateFromInputAndFrame>["value"];
  sourceX: number;
};

/** Renders the rehearsal outputs in authored paint order. */
export function RehearsalOutputs(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.outputs.map((output, index) => {
        return (
          <RehearsalOutput
            key={output.id}
            output={output}
            source={options.input.source}
            value={options.value}
            index={index}
            frame={options.frame}
            accent={options.accent}
            sourceX={options.sourceX}
            showRules={options.input.showRules}
            showBaselineMarkers={options.input.showBaselineMarkers}
          />
        );
      })}
    </>
  );
}
