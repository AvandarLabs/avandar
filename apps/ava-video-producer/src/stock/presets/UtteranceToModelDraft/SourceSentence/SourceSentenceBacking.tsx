import { prop } from "@avandar/utils";
import type { useSourceSentencePresentation } from "./useSourceSentencePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSourceSentencePresentation>,
  "parts" | "background"
>;
/** Render the source sentence backing. */
export function SourceSentenceBacking(props: Readonly<Props>): ReactNode {
  return (
    <rect
      data-source-backing="true"
      x={44}
      y={96}
      width={896}
      height={Math.max(...props.parts.map(prop("y"))) - 96 + 14}
      fill={props.background}
    />
  );
}
