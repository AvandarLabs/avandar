import type { makeCoordinateTriageFromInputAndFrame } from "../makeCoordinateTriageFromInputAndFrame";
/** Inputs shared by the CoordinateRowSource visuals. */
export type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  showValues: boolean;
};
