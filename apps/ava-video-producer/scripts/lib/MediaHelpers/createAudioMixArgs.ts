import { getPublicAssetPathFromAsset } from "../planHelpers/planHelpers";
import type { AudioTrack } from "./MediaHelpers.types";

function _getOutputArgs({
  duration,
  destination,
}: Readonly<{ duration: number; destination: string }>): string[] {
  return [
    "-map",
    "0:v:0",
    "-map",
    "[mix]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(duration),
    "-movflags",
    "+faststart",
    destination,
  ];
}
function _getMixFilters({
  tracks,
  fps,
}: Readonly<{ tracks: readonly AudioTrack[]; fps: number }>): string[] {
  const filters = tracks.map((track, index) => {
    const delay = Math.round((track.atFrame / fps) * 1000);
    return `[${index + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${track.volume},adelay=${delay}|${delay}[a${index}]`;
  });
  filters.push(
    `${tracks
      .map((_, index) => {
        return `[a${index}]`;
      })
      .join(
        "",
      )}amix=inputs=${tracks.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95:level=false:latency=1,apad[mix]`,
  );
  return filters;
}
type MixArgsOptions = {
  picture: string;
  destination: string;
  root: string;
  tracks: readonly AudioTrack[];
  fps: number;
  duration: number;
};
/** Constructs the serial audio input and filter arguments for a picture mix. */
export async function createAudioMixArgs({
  picture,
  destination,
  root,
  tracks,
  fps,
  duration,
}: Readonly<MixArgsOptions>): Promise<string[]> {
  const args = ["-y", "-loglevel", "error", "-i", picture];
  for (const track of tracks) {
    // Resolve in filter order and stop before later paths if one is unsafe.
    args.push(
      "-i",
      await getPublicAssetPathFromAsset({ root, asset: track.src }),
    );
  }
  args.push("-filter_complex", _getMixFilters({ tracks, fps }).join(";"));
  args.push(..._getOutputArgs({ duration, destination }));
  return args;
}
