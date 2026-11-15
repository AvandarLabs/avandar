import { ExceptionCase } from "./ExceptionCase";
import { ExceptionRoute } from "./ExceptionRoute";
import { RuleGate } from "./RuleGate";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ExceptionDetour.schema";
import type { ReactNode } from "react";
/** Complete authored rule and exception content. */
export type Props = GraphicProps & { input: Input };
/** A case follows the exceptional route around an intact standard rule. */
export function ExceptionDetour({
  input,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <RuleGate {...{ ...remainingProps, input }} />
      <ExceptionRoute {...{ ...remainingProps, input }} />
      <ExceptionCase {...{ ...remainingProps, input }} />
    </g>
  );
}
