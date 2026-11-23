/** Inputs consumed by the corresponding rendered assertions. */

export type DestinationSegmentOptions = {
  x: number;
  topY: number;
  startY: number;
  outside: number;
};

/** Independent rectangle enclosing one drawn overflow-crest segment. */
export type CrestSegment = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
