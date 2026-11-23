import type { Storyboard } from "../../../src/storyboard/schema/schema";
/** Inputs for assembling approved audio over a checked picture. */
export type MixAudioParameters = {
  plan: Storyboard;
  root: string;
  picture: string;
  destination: string;
};
/** Options passed to a child process without a shell. */
export type RunOptions = {
  cwd?: string;
  quiet?: boolean;
  env?: NodeJS.ProcessEnv;
};
/** Media stream fields reported by ffprobe. */
export type MediaStream = {
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  duration?: string;
  nb_frames?: string;
  sample_rate?: string;
};
/** Container duration and streams reported by ffprobe. */
export type MediaProbe = { duration: number; streams: MediaStream[] };
/** An approved audio source at its film time and gain. */
export type AudioTrack = { src: string; atFrame: number; volume: number };
