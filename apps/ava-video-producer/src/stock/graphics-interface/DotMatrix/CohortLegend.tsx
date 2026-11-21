import { Fragment } from "react";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { Drawing } from "./DotMatrix.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the cohort legend layer for DotMatrix. */
export function CohortLegend(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.showLegend
        ? props.input.groups.map((group, index) => {
            const x = 78 + index * 189;
            return (
              <Fragment key={x}>
                <circle
                  cx={x}
                  cy={492}
                  r={5}
                  fill={group.selected ? props.accent : props.color.inactive}
                  fillOpacity={group.selected ? undefined : props.alpha.dimmed}
                />
                <Text role="caption" x={x + 16} y={498}>
                  {group.value} {group.label}
                </Text>
              </Fragment>
            );
          })
        : null}
      <Text role="pill" x={64} y={553}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].illustrativeCohort,
          values: { count: props.cohort.cohortTotal },
        })}
      </Text>
    </>
  );
}
