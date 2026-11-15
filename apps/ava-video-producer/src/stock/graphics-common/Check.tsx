import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";

/** A themed check mark in the caller's colour and size. */
export function Check({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}) {
  const check = useGraphicProps("Check", {});
  const s = size;
  return (
    <path
      d={`M${x - s * 0.5} ${y} l${s * 0.35} ${s * 0.36} l${s * 0.7} ${-s * 0.8}`}
      fill="none"
      stroke={color}
      strokeWidth={check.strokeWidth}
      strokeLinecap={check.cap}
      strokeLinejoin={check.join}
    />
  );
}
