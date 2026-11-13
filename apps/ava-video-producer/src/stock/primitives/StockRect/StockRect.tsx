import rough from "roughjs";
import { useGraphicTokens } from "../../theme/useGraphicTheme";
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
  const generator = rough.generator();
  const paths = generator.toPaths(
    generator.rectangle(x, y, width, height, {
      roughness: profile.roughness,
      bowing: profile.bowing,
      seed: profile.seed,
      stroke,
      fill,
      fillStyle: "solid",
      strokeWidth: Number(strokeWidth),
      maxRandomnessOffset: profile.randomness,
    }),
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
