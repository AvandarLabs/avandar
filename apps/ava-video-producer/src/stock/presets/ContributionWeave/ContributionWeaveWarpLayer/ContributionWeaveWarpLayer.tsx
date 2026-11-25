import { WeaveWarp } from "../WeaveWarp";
import type { ContributionWeave } from "../ContributionWeave";
import type { ReactNode } from "react";

type WeaveWarpProperties = {
  numWarp: number;
  input: Parameters<typeof ContributionWeave>[0]["input"];
  frame: Parameters<typeof ContributionWeave>[0]["frame"];
  id: Parameters<typeof ContributionWeave>[0]["id"];
};

type Props = {
  input: Parameters<typeof ContributionWeave>[0]["input"];
  warpProps: WeaveWarpProperties;
};

/** Renders the warp layer with authored geometry. */
export function ContributionWeaveWarpLayer({
  input,
  warpProps,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.warp.map((contributor, index) => {
        return (
          <WeaveWarp
            key={contributor.id}
            contributor={contributor}
            index={index}
            {...warpProps}
          />
        );
      })}
    </>
  );
}
