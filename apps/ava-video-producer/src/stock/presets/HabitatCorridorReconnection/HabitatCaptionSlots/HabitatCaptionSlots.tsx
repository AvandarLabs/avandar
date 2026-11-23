import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  labels: Array<
    Exclude<
      Array<
        | {
            text: Input["copy"]["map"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["copy"][Input["decision"]["stage"]];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["corridor"]["label"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: string;
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["copy"]["lengthUnit"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["copy"]["crossing"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["copy"]["barrier"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | {
            text: Input["copy"]["disclaimer"];
            x: number;
            y: number;
            width: number;
            maxLines: number;
          }
        | (
            | {
                text: Input["copy"]["traversal"];
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
export function HabitatCaptionSlots({ labels }: Readonly<Props>): ReactNode {
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
