import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = {
  member: Input["groups"][number]["members"][number];
  index: number;
  groupIndex: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  member: Readonly<ParentProps>["member"];
  input: Readonly<ParentProps>["input"];
  x: number;
};

/** Renders the reunion member caption in authored paint order. */
export function ReunionMemberCaption(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.showMemberLabels ? (
        <FitText
          text={options.member.label}
          x={options.x}
          y={444}
          width={82}
          fontSize={12}
          maxLines={5}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </>
  );
}
