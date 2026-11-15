import { createContext, useContext } from "react";
import rough from "roughjs";
import type { SVGProps } from "react";

/** Optional sketch treatment for editorial boxes. Product UI does not use it. */
export const StockBoxRoughnessContext = createContext(0);

/** Seeded box outlines retain crisp text and the original SVG at roughness zero. */
export function StockRect(props: SVGProps<SVGRectElement>) {
  const roughness = useContext(StockBoxRoughnessContext);
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
    !roughness ||
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
      roughness,
      seed: 17,
      stroke,
      fill,
      fillStyle: "solid",
      strokeWidth: Number(strokeWidth),
      maxRandomnessOffset: 3,
    }),
  );
  return (
    <g {...attributes} data-rough-box={roughness}>
      {paths.map((path, index) => (
        <path key={index} {...path} />
      ))}
      {children}
    </g>
  );
}
