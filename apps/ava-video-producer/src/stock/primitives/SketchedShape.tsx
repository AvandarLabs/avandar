import {
  getSketchPathsFromShape,
  type SketchShape,
} from "../../videoTheme/sketchShape/sketchShape";
import type { ResolvedSketchProfile } from "../../videoTheme/videoTheme.types";
import type { ReactNode, SVGProps } from "react";

type PathAttributes = Pick<
  SVGProps<SVGPathElement>,
  | "pathLength"
  | "strokeDasharray"
  | "strokeDashoffset"
  | "strokeLinecap"
  | "strokeLinejoin"
>;

type Props = Readonly<
  {
    shape: SketchShape;
    profile: ResolvedSketchProfile;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fillOpacity?: number;
    strokeOpacity?: number;
    opacity?: number;
  } & PathAttributes
>;

function _plainShape({ shape, profile: _profile, ...attributes }: Props) {
  switch (shape.kind) {
    case "rect":
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...attributes}
        />
      );
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...attributes} />;
    case "ellipse":
      return (
        <ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          {...attributes}
        />
      );
    case "line":
      return (
        <line
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          {...attributes}
        />
      );
    case "path":
      return <path d={shape.d} {...attributes} />;
  }
}

/**
 * A circle, ellipse, line, path, or rect drawn smooth, exactly as the plain
 * SVG element, or as seeded hand-drawn paths when the profile is rough. Path
 * attributes such as a draw-on dash apply to every sketched path.
 */
export function SketchedShape(props: Props): ReactNode {
  const {
    shape,
    profile,
    stroke,
    strokeWidth,
    fill,
    fillOpacity,
    strokeOpacity,
    opacity,
    ...pathAttributes
  } = props;
  const paths =
    stroke && stroke !== "none"
      ? getSketchPathsFromShape(shape, profile, {
          stroke,
          strokeWidth: strokeWidth ?? 1,
          fill,
        })
      : [];
  if (paths.length === 0) {
    return _plainShape(props);
  }
  return (
    <g
      fillOpacity={fillOpacity}
      strokeOpacity={strokeOpacity}
      opacity={opacity}
      data-rough-shape={profile.roughness}
    >
      {paths.map((path, index) => {
        return <path key={index} {...path} {...pathAttributes} />;
      })}
    </g>
  );
}
