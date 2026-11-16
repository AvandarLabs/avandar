import { getSketchPathsFromShape } from "../../../videoTheme/sketchShape/sketchShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { SVGProps } from "react";

/**
 * A box drawn with the theme's box sketch profile (`sketch.box`): the plain
 * SVG rect while the profile is smooth, seeded roughjs outlines otherwise.
 * Text is never sketched. Used by panels, pills, and preset boxes.
 */
export function StockRect(props: SVGProps<SVGRectElement>) {
  const profile = useGraphicTokens().sketch.box;
  const {
    x = 0,
    y = 0,
    width,
    height,
    stroke,
    fill = "none",
    strokeWidth = 1,
    rx: _rx,
    ry: _ry,
    children,
    ...attributes
  } = props;
  if (
    !profile.roughness ||
    !stroke ||
    stroke === "none" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return <rect {...props} />;
  }
  const paths = getSketchPathsFromShape(
    { kind: "rect", x, y, width, height },
    profile,
    { stroke, strokeWidth: Number(strokeWidth), fill },
  );
  return (
    <g {...attributes} data-rough-box={profile.roughness}>
      {paths.map((path, index) => (
        <path key={index} {...path} />
      ))}
      {children}
    </g>
  );
}
