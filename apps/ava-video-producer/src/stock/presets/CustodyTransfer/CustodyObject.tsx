import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CustodyObjectShape } from "./CustodyObjectShape";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const DETAILS = {
  x: 534,
  width: 310,
  fontSize: 14 as const,
  maxLines: 2,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "width"
  | "fontSize"
  | "maxLines"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/** One object keeps a fixed adjoining label area in all three metaphors. */
export function CustodyObject({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const label = {
    text: input.object.label,
    x: 480,
    y: 108,
    width: 700,
    fontSize: 18 as const,
    maxLines: 2,
    anchor: "middle" as const,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
  return (
    <g data-object-shape={input.objectShape} opacity={motion.reveal(frame, 14)}>
      <CustodyObjectShape shape={input.objectShape} accent={accent} />
      {input.showLabels ? (
        <g>
          <FitText {...label} />
          {input.object.details.map((text, index) => {
            return (
              // prettier-ignore
              // Detail text occupies fixed stacked lines
              // inside one object. Duplicate detail text is
              // valid and has no independent state.
              // react-doctor-disable-next-line no-array-index-as-key
              <FitText key={index}
                {...DETAILS}
                text={text}
                y={260 + index * 35}
              />
            );
          })}
        </g>
      ) : undefined}
    </g>
  );
}
