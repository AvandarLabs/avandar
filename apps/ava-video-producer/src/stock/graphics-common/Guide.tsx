import { SketchedShape } from "../primitives/SketchedShape";
import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";

/** A themed dashed guide ellipse, such as an orbit. */
export function Guide({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  const guide = useGraphicProps("Guide", {});
  return (
    <SketchedShape
      shape={{ kind: "ellipse", cx, cy, rx, ry }}
      profile={guide.sketch}
      fill="none"
      stroke={guide.color}
      strokeWidth={guide.strokeWidth}
      strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined}
      opacity={guide.alpha}
    />
  );
}
