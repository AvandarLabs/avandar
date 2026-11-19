import { RangeNumberInput } from "../../RangeNumberInput";
import css from "./BezierFields.module.css";

type Bezier = readonly [number, number, number, number];

type Props = Readonly<{
  points: Bezier;
  isCameraCurve: boolean;
  onChange: (points: Bezier) => void;
}>;

function _withPoint(points: Bezier, index: number, value: number): Bezier {
  const [x1, y1, x2, y2] = points;
  return [
    index === 0 ? value : x1,
    index === 1 ? value : y1,
    index === 2 ? value : x2,
    index === 3 ? value : y2,
  ];
}

/** The four Bezier control values. A camera curve keeps every point in 0..1. */
export function BezierFields({ points, isCameraCurve, onChange }: Props) {
  const names = ["Start x", "Start y", "End x", "End y"];
  return (
    <div className={css.bezierFields}>
      {points.map((point, index) => {
        return (
          <RangeNumberInput
            key={names[index]}
            size="xs"
            label={names[index]}
            min={isCameraCurve || index % 2 === 0 ? 0 : -1}
            max={isCameraCurve || index % 2 === 0 ? 1 : 2}
            step={0.01}
            decimalScale={3}
            value={point}
            onChange={(pointValue) => {
              return onChange(_withPoint(points, index, pointValue));
            }}
          />
        );
      })}
    </div>
  );
}
