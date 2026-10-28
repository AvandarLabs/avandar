import { FoundationSlab } from "./FoundationSlab";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  variant: Input["foundationReveal"];
  isMask: boolean;
};
/** The selected reveal represents a single principle in either arrangement. */
export function FoundationSlabs({
  frame,
  variant,
  isMask,
}: Readonly<Props>): ReactNode {
  return variant === "join" ? (
    <>
      <FoundationSlab {...{ frame, isMask }} piece="left" />
      <FoundationSlab {...{ frame, isMask }} piece="right" />
    </>
  ) : (
    <FoundationSlab {...{ frame, isMask }} piece="continuous" />
  );
}
