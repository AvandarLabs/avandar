import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Exact source equality is displayed only after all transfers settle. */
export function AliquotEquation({ input }: Readonly<Props>): ReactNode {
  const remainder =
    input.parent.volume -
    input.aliquots.reduce((total, { volume }) => total + volume, 0);
  return (
    <FitText
      text={`${input.parent.volume} = ${input.aliquots.map(prop("volume")).join(" + ")} + ${remainder}`}
      x={50}
      y={545}
      width={620}
      fontSize={20}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  );
}
