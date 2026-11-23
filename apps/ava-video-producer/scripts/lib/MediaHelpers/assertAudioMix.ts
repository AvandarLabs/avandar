import { propEq } from "@avandar/utils";
import { audioPeak } from "./audioPeak";
import { probe } from "./probe";
import { videoHash } from "./videoHash";
import type { AudioTrack } from "./MediaHelpers.types";

type AudioMixOptions = {
  picture: string;
  destination: string;
  tracks: readonly AudioTrack[];
  expectedDuration: number;
};
/** Verifies assembled audio, picture packet identity, and film duration. */
export async function assertAudioMix({
  picture,
  destination,
  tracks,
  expectedDuration,
}: Readonly<AudioMixOptions>): Promise<void> {
  const result = await probe(destination);
  if (!result.streams.some(propEq("codec_type", "audio"))) {
    throw new Error("Audio assembly produced no audio stream");
  }
  if (Math.abs(result.duration - expectedDuration) > 0.08) {
    throw new Error("Audio assembly changed film duration");
  }
  if ((await videoHash(picture)) !== (await videoHash(destination))) {
    throw new Error("Audio assembly changed the video packets");
  }
  if (
    tracks.some((track) => {
      return track.volume > 0;
    }) &&
    (await audioPeak({ filename: destination })) <= -80
  ) {
    throw new Error("Assembled audio is silent");
  }
}
