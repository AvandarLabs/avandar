/**
 * Formats a 0-based `frame` at `fps` into an `HH:MM:SS,mmm` (or WebVTT
 * `HH:MM:SS.mmm`) timestamp string using rounded millisecond boundaries.
 * Called by `makeCaptionFilesFromPlan`.
 */
export function makeTimestampFromFrame({
  frame,
  fps,
  separator = ",",
}: Readonly<{
  frame: number;
  fps: number;
  separator?: string;
}>): string {
  const milliseconds = Math.round((frame * 1000) / fps);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const fraction = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(fraction).padStart(3, "0")}`;
}
