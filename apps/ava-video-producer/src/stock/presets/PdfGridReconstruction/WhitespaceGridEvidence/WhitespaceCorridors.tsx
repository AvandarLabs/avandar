import type { useWhitespaceGridEvidencePresentation } from "./useWhitespaceGridEvidencePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useWhitespaceGridEvidencePresentation>,
  "input" | "atomic" | "tokens" | "scales" | "width" | "height" | "progress"
>;
/** Render the whitespace corridors. */
export function WhitespaceCorridors(props: Readonly<Props>): ReactNode {
  return (
    <g>
      {Array.from(
        { length: props.input.grid.columnLabels.length - 1 },
        (_, index) => {
          return (
            <rect
              key={`v${index}`}
              data-whitespace-corridor={`v${index}`}
              x={48 + (index + 1) * props.width}
              y={210}
              width={8}
              height={props.height * props.progress}
              fill={props.tokens.color.highlight}
              fillOpacity={props.scales.wash(props.atomic.opacity["25"])}
            />
          );
        },
      )}
      {Array.from({ length: props.input.grid.rows.length }, (_, index) => {
        return (
          <rect
            key={`h${index}`}
            data-whitespace-corridor={`h${index}`}
            x={52}
            y={286 + index * 64}
            width={400 * props.progress}
            height={8}
            fill={props.tokens.color.highlight}
            fillOpacity={props.scales.wash(props.atomic.opacity["25"])}
          />
        );
      })}
    </g>
  );
}
