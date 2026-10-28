import { PocketInput } from "./PocketInput";
import { PocketResponse } from "./PocketResponse";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Input and authored response share the device's fixed internal writing area.
 */
export function InternalWriting({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PocketInput {...{ frame, input }} />
      <PocketResponse {...{ frame, input, accent }} />
    </g>
  );
}
