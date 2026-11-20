import { getSnapshotCellFromFrame } from "../getSnapshotCellFromFrame";
/** Inputs shared by the SnapshotCell visuals. */
export type CellFrameProps = Readonly<{
  scene: ReturnType<typeof getSnapshotCellFromFrame>;
  snapshot: boolean;
  frame: number;
  diagonal: number;
  accent: string;
}>;
