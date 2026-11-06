import { STOCK } from "../../stockPalette";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Alignment Guides for the authored scene. */
export function AlignmentGuides({ input }: Readonly<Props>): ReactNode {
  return input.showAlignmentGuides ? (
    <path
      data-alignment-guide={input.task.value}
      d={`M30 24 V75 M${30 + input.task.value * 12} 24 V75`}
      stroke={STOCK.muted}
      strokeWidth={1}
      strokeDasharray="3 4"
    />
  ) : undefined;
}
