import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  group: Readonly<ParentProps>["input"]["groups"][number];
  groupIndex: number;
};

/** Renders the reunion group caption in authored paint order. */
export function ReunionGroupCaption(options: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={options.group.label}
      x={options.groupIndex === 0 ? 60 : 580}
      y={132}
      width={320}
      fontSize={14}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
