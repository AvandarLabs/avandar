import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  source: Readonly<ParentProps>["input"]["sourceRows"][number] | undefined;
  y: number;
  isApplied: boolean;
  isChanged: boolean;
};

/** Renders the refresh outcome label in authored paint order. */
export function RefreshOutcomeLabel(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.isApplied ? (
        <LabelSlots
          labels={[
            [
              !options.source
                ? options.input.labels.missing
                : !options.isChanged
                  ? options.input.labels.unchanged
                  : "",
              220,
              options.y + 56,
              350,
              12,
              3,
            ],
          ]}
        />
      ) : null}
    </>
  );
}
