import type { CSSProperties } from "react";
/** The parts of one column's stats every line shares. */
export type StatLineProps = Readonly<{
  width: number;
  height: number;
  side: number;
  fontWeight: CSSProperties["fontWeight"];
  arrive: CSSProperties;
}>;
