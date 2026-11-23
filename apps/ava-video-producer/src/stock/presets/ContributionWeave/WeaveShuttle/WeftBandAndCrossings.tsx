import { FitText } from "../../../primitives/FitText/FitText";
import { WeaveCrossing } from "../WeaveCrossing";
import type { Input } from "../ContributionWeave.schema";
import type { ReactNode } from "react";

type ParentProps = {
  contributor: Input["weft"][number];
  index: number;
  input: Input;
  frame: number;
  id: string;
};

type Props = {
  contributor: Readonly<ParentProps>["contributor"];
  input: Readonly<ParentProps>["input"];
  pattern: string;
  clipId: string;
  band: { x: number; y: number; width: number; height: number };
  end: { x: number; y: number; width: number; height: number; fill: string };
  label: {
    text: Readonly<ParentProps>["contributor"]["label"];
    x: number;
    y: number;
    width: number;
    fontSize: 12;
    maxLines: number;
    breakLongWords: boolean;
    normalizeWhitespace: boolean;
  };
  crossingProps: {
    row: Readonly<ParentProps>["index"];
    weft: Readonly<ParentProps>["contributor"];
    input: Readonly<ParentProps>["input"];
    id: Readonly<ParentProps>["id"];
    y: number;
  };
};

/** Renders the weave shuttledefs in authored paint order. */
export function WeftBandAndCrossings(options: Readonly<Props>): ReactNode {
  return (
    <>
      <defs>
        <clipPath id={options.clipId}>
          <rect {...options.band} />
        </clipPath>
      </defs>
      <rect
        data-weft-band={options.contributor.id}
        {...options.band}
        fill={options.pattern}
      />
      <g clipPath={`url(#${options.clipId})`}>
        {options.input.warp.map((warp, column) => {
          return (
            <WeaveCrossing
              key={warp.id}
              warp={warp}
              column={column}
              {...options.crossingProps}
            />
          );
        })}
      </g>
      {options.input.showContributorEnds ? (
        <rect data-contributor-end={options.contributor.id} {...options.end} />
      ) : undefined}
      {options.input.showLabels ? <FitText {...options.label} /> : undefined}
    </>
  );
}
