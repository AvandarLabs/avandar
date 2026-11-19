import { formatReadout } from "./demoTheme";
import type { CSSProperties } from "react";

/** The style value a line reveal mode changes, for the readout. */
export function describeStyle(style: CSSProperties): string {
  return style.clipPath
    ? `clipPath ${String(style.clipPath)}`
    : `opacity ${formatReadout(Number(style.opacity ?? 1))}`;
}
