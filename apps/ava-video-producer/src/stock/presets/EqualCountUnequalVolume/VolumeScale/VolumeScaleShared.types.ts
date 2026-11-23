import type { Input } from "../EqualCountUnequalVolume.schema";
/** Inputs shared by the VolumeScale visuals. */
export type Props = {
  input: Input;
  group: Input["groups"][number];
  y: number;
  accent: string;
};
