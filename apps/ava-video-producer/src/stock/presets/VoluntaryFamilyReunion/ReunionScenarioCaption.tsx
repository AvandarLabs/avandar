import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  input: Readonly<ParentProps>["input"];
};

/** Renders the reunion scenario caption in authored paint order. */
export function ReunionScenarioCaption(options: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={options.input.scenarioCaption}
      x={50}
      y={570}
      width={860}
      fontSize={12}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  );
}
