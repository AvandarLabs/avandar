import { DemoTheme } from "./DemoTheme";
import type { CSSProperties } from "react";
/** The style value a line reveal mode changes, for the readout. */
export function describeStyle(style: CSSProperties): string {
  return style.clipPath
    ? `clipPath ${String(style.clipPath)}`
    : `opacity ${DemoTheme.formatReadout({ value: Number(style.opacity ?? 1) })}`;
}
