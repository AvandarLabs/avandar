import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  labels: Array<
    Exclude<
      Array<
        | {
            text: Input["copy"]["disclaimer"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["decision"]["actorLabel"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["decision"]["actionLabel"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | (
            | {
                text: Input["copy"]["fieldCheck"];
                x: number;
                y: number;
                width: number;
                maxLines: number;
              }
            | undefined
          )
        | (
            | {
                text: Input["copy"]["pointSupport"];
                x: number;
                y: number;
                width: number;
                maxLines: number;
              }
            | undefined
          )
      >[number],
      undefined
    >
  >;
};

/** Renders the text label with authored geometry. */
export function ObservationCaptionSlots({
  labels,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {labels.map(({ text, x, y, width, maxLines }) => {
        return (
          <FitText
            key={`${x}:${y}`}
            {...{ text, x, y, width }}
            fontSize={12}
            maxLines={maxLines}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
    </>
  );
}
