import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";
type Props = { input: Input; transferred: number };
/** Source identity, tube count and material are independent quantities. */
export function AliquotLedger({
  input,
  transferred,
}: Readonly<Props>): ReactNode {
  const rows = [
    { label: input.copy.source, value: 1 },
    { label: input.copy.tubes, value: input.aliquots.length + 1 },
    { label: input.copy.parentVolume, value: input.parent.volume },
    { label: input.copy.transferred, value: transferred.toFixed(1) },
    {
      label: input.copy.remainder,
      value: (input.parent.volume - transferred).toFixed(1),
    },
  ];
  return (
    <g>
      {rows.map(({ label, value }, index) => (
        <g key={index}>
          <FitText
            text={label}
            x={755}
            y={112 + index * 88}
            width={175}
            fontSize={12}
            maxLines={5}
            breakLongWords
            normalizeWhitespace
          />
          <FitText
            text={String(value)}
            x={740}
            y={112 + index * 88}
            width={65}
            fontSize={18}
            maxLines={1}
            anchor="end"
            normalizeWhitespace
          />
        </g>
      ))}
    </g>
  );
}
