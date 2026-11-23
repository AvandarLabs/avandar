import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = {
  labels: Array<
    | {
        text: Input["receipts"][number]["label"];
        y: number;
        maxLines: number;
        color: undefined;
      }
    | (
        | Array<{
            text: Input["receipts"][number]["entryId"];
            y: number;
            maxLines: number;
            color: string;
          }>
        | never[]
      )[number]
  >;
  width: number;
};

/** Renders the labels layer with authored geometry. */
export function ReceiptLabelSlots({
  labels,
  width,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {labels.map((label) => {
        return (
          <FitText
            key={label.y}
            {...label}
            x={10}
            width={width - 20}
            fontSize={12}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </>
  );
}
