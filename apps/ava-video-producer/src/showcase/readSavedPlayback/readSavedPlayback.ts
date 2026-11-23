import { z } from "zod";

const savedPlaybackSchema = z.object({
  frame: z.number(),
  playing: z.boolean(),
  captions: z.boolean(),
  speed: z.number().optional(),
  loop: z.boolean().optional(),
});
type SavedPlayback = z.output<typeof savedPlaybackSchema>;
/** Reads valid playback saved before a live film reload. */
export function readSavedPlayback({
  storage,
  key,
}: Readonly<{ storage: Pick<Storage, "getItem">; key: string }>):
  | SavedPlayback
  | undefined {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
    const result = savedPlaybackSchema.safeParse(value);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
