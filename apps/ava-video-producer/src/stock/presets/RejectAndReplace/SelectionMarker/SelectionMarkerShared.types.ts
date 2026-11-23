import type { Input } from "../RejectAndReplace.schema";
/** Inputs shared by the SelectionMarker visuals. */
export type Props = {
  frame: number;
  accent: string;
  isReplacement: boolean;
  rejectionMark: Input["rejectionMark"];
};
