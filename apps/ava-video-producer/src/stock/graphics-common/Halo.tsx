import {
  useGraphicFilter,
  useGraphicProps,
} from "../theme/useGraphicTheme/useGraphicTheme";

/** The theme's soft disc around a point, such as a packet's halo. */
export function Halo({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  const { glow } = useGraphicProps("Halo", {});
  const filter = useGraphicFilter("components.Halo.glow");
  return (
    <circle
      filter={filter}
      cx={cx}
      cy={cy}
      r={r + glow.spread}
      fill={color}
      fillOpacity={glow.opacity}
    />
  );
}
