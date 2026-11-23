import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { ComparisonStroke } from "./ComparisonStroke";
import type { Input } from "../DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Header and fingerprint tags have independent, exact comparison strokes. */
export function ComparisonTags({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LiteralDataText value={input.saved.header} x={52} y={416} />
      <LiteralDataText value={input.current.header} x={508} y={416} />
      <LiteralDataText value={input.saved.fingerprint} x={52} y={450} />
      <LiteralDataText value={input.current.fingerprint} x={508} y={450} />
      <ComparisonStroke
        y={412}
        isMatch={input.saved.header === input.current.header}
        frame={frame}
        at={51}
        accent={accent}
      />
      <ComparisonStroke
        y={446}
        isMatch={input.saved.fingerprint === input.current.fingerprint}
        frame={frame}
        at={78}
        accent={accent}
      />
    </g>
  );
}
