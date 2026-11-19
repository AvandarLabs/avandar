import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }): ReactNode {
  const glyph = useGraphicProps("Glyph", {});
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={glyph.strokeWidth} />
  );
}
