/** What the gate's command line asks it to check. */
export type GateArguments = {
  file: string;
  isStandalone: boolean;
  declaredCuts: number[];
};

/**
 * A video's per-frame measurements, as `getFrameMeasurementsFromVideo` reads
 * them.
 */
export type FrameMeasurements = {
  width: number;
  height: number;
  halves: number[];
  luma: number[];
  contrast: number[];
};

/** How a declared cut was judged. See `makeJudgedCutsFromLuma`. */
export type CutVerdict = "accepted" | "flash" | "under-limit" | "outside-video";

/** One declared cut and its verdict, as `makeJudgedCutsFromLuma` reports it. */
export type JudgedCut = {
  frame: number;
  verdict: CutVerdict;
  jump?: number;
  reversal?: number;
  reversalFrame?: number;
};

/**
 * One frame flagged as tiled, with how far its halves match above its
 * neighbours', in dB.
 */
export type TiledFrame = { frame: number; spike: number };
