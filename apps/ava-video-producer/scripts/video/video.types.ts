import type { COMMANDS } from "./video.constants";

/** One CLI command name. */
export type Command = (typeof COMMANDS)[number];

/** The parsed CLI arguments. */
export type Options = {
  command: Command;
  filename: string;
  audio?: string;
  srt?: string;
  voice?: string;
  rate?: number;
  theme?: string;
};

/** One rendered preview still: its frame, image file name, and shot id. */
export type PreviewSample = { frame: number; file: string; shot: string };
