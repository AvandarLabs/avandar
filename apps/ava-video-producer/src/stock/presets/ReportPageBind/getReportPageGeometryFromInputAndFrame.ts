import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./ReportPageBind.schema";
/**
 * Both first-page header and section paper share the same physical position.
 */
export function getReportPageGeometryFromInputAndFrame({
  input,
  frame,
  index,
}: Readonly<{ input: Input; frame: number; index: number }>): {
  x: number;
  y: number;
  margins: number;
} {
  const binding = ramp(frame, 104, 32, EASE.inOut);
  const isStack = input.finalView === "stack";
  return {
    x: mix(binding, 110, isStack ? 80 + index * 12 : 64),
    y: mix(
      binding,
      148 + index * 124,
      (isStack ? 136 : 128) + index * (isStack ? 124 : 138),
    ),
    margins: ramp(frame, 38, 66, EASE.inOut),
  };
}
