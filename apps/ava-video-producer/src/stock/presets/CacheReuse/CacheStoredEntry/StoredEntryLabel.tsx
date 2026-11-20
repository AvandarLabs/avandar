import { FitText } from "../../../primitives/FitText/FitText";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { type Props } from "./CacheStoredEntryShared.types";
import type { ReactNode } from "react";
/** The entry's key over the label of the result it holds. */
export function StoredEntryLabel({
  input,
  accent,
}: Readonly<Pick<Props, "input" | "accent">>): ReactNode {
  return (
    <>
      <LiteralDataText
        value={input.request.key}
        x={430}
        y={245}
        color={accent}
      />
      <FitText
        text={input.result.label}
        x={430}
        y={275}
        width={450}
        fontSize={16}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
    </>
  );
}
