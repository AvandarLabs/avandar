import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";

/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }) {
  const glyph = useGraphicProps("Glyph", {});
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={glyph.strokeWidth} />
  );
}
