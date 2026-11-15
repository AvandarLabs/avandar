import { STOCK } from "../../stockPalette";
import type { SourceMergeInput } from "./SourceMerge.schema";

/** Complete fictional example used only when input is omitted. */
export const sourceMergeDefaultInput: SourceMergeInput = {
  sources: [
    { name: "Records", kind: "CSV", color: STOCK.cyan },
    { name: "Events", kind: "API", color: STOCK.mint },
    { name: "Documents", kind: "TXT", color: STOCK.orange },
  ],
  destination: { label: "One dataset", detail: "A shared structure" },
  showPackets: true,
};

/** The maximum supported collection density in the authored layout. */
export const sourceMergeDenseInput: SourceMergeInput = {
  ...sourceMergeDefaultInput,
};

/** A complete smaller or differently selected authored example. */
export const sourceMergeChangedInput: SourceMergeInput = {
  ...sourceMergeDefaultInput,
  sources: [{ name: "Intake", kind: "CSV", color: STOCK.cyan }],
  destination: { label: "Case view", detail: "Authored mapping" },
  showPackets: false,
};

/** Named examples available to editors and semantic regression checks. */
export const sourceMergeFixtures: Array<{
  id: string;
  input: {
    sources: Array<{ name: string; kind: string; color: string }>;
    destination: { label: string; detail: string };
    showPackets: boolean;
  };
}> = [
  { id: "default", input: sourceMergeDefaultInput },
  { id: "dense", input: sourceMergeDenseInput },
  { id: "changed", input: sourceMergeChangedInput },
];
