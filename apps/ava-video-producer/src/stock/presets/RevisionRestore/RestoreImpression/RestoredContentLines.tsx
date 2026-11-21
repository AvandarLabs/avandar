import { Motion } from "../../../../motion";
import { ImpressionLine } from "./ImpressionLine";
import type { Input } from "../RevisionRestore.schema";
import type { ReactNode } from "react";

type ParentProps = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  accent: string;
};

type Props = {
  revision: Readonly<ParentProps>["revision"];
  index: Readonly<ParentProps>["index"];
  accent: Readonly<ParentProps>["accent"];
  progress: number;
};

/** Renders the restored content lines in authored paint order. */
export function RestoredContentLines(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.revision.content.map((line, lineIndex) => {
        return (
          <ImpressionLine
            key={lineIndex}
            d={`M${Motion.mix({
              t: options.progress,
              from: 60 + options.index * 225,
              to: 294,
            })} ${Motion.mix({
              t: options.progress,
              from: 433 + lineIndex * 43,
              to: 174 + lineIndex * 53,
            })} h${Math.min(150, 20 + line.length * 4)}`}
            accent={options.accent}
          />
        );
      })}
    </>
  );
}
