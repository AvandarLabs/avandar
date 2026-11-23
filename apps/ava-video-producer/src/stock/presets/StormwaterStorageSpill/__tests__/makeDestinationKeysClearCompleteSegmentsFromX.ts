import {
  type DestinationSegmentOptions,
  type CrestSegment,
} from "./StormwaterStorageSpillPhysicalDestinationKeysNeverCoverTestState.types";

/**
 * Makes fresh fixture state for destination keys clear the complete visible
 * overflow crest.
 */
export function makeDestinationKeysClearCompleteSegmentsFromX({
  x,
  topY,
  startY,
  outside,
}: Readonly<DestinationSegmentOptions>): CrestSegment[] {
  return [
    {
      left: x - 1.5,
      right: x + 1.5,
      top: topY - 1.5,
      bottom: startY + 1.5,
    },
    {
      left: Math.min(x, outside) - 1.5,
      right: Math.max(x, outside) + 1.5,
      top: topY - 1.5,
      bottom: topY + 1.5,
    },
    {
      left: outside - 1.5,
      right: outside + 1.5,
      top: topY - 1.5,
      bottom: 401.5,
    },
  ];
}
