import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { getKernelSamplesFromInput } from "../getKernelSamplesFromInput";
import type { KernelDensitySpread } from "../KernelDensitySpread";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof KernelDensitySpread>[0]["input"];
  radius: ReturnType<typeof getKernelSamplesFromInput>["radius"];
  qualifier: string;
};

/** Renders the labels with authored geometry. */
export function KernelDensitySpreadLabels({
  input,
  radius,
  qualifier,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [input.labels.radius, 610, 48, 310, 16, 3],
        [String(Number(radius.toPrecision(3))), 610, 122, 310, 20, 1],
        [input.labels.intensity, 610, 182, 310, 14, 3],
        [input.labels.unit, 610, 260, 310, 12, 3],
        [input.labels.points, 610, 365, 310, 12, 3],
        [qualifier, 610, 470, 310, 12, 4],
      ]}
    />
  );
}
