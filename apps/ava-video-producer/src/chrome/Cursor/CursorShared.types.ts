import { type CursorKey, type CursorKind } from "../../CursorMotionHelpers";
/** Inputs shared by the Cursor visuals. */
export type Props = {
  frame: number;
  path: readonly CursorKey[];
  clicks?: readonly number[];
  cursor?: CursorKind;
};
