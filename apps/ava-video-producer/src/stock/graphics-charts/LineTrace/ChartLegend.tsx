import { Text } from "../../graphics-common/Text";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the chart legend layer for LineTrace. */
export function ChartLegend(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="footnote" x={121} y={491}>
        01
      </Text>
      <Text role="footnote" x={839} y={491} anchor="end">
        {String(props.input.points.length).padStart(2, "0")}
      </Text>
      <circle cx={121} cy={543} r={4} fill={props.accent} />
      <Text role="note" x={137} y={548}>
        {props.input.seriesLabel}
      </Text>
      {props.input.showReference ? (
        <>
          <circle
            cx={260}
            cy={543}
            r={4}
            fill={props.color.accentAlt}
            fillOpacity={props.atomic.opacity["50"]}
          />
          <Text role="note" x={276} y={548}>
            {props.input.referenceLabel}
          </Text>
        </>
      ) : null}
    </>
  );
}
