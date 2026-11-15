import { z } from "zod";
import type { StockMetadata } from "../StockContract.types";

const MESSAGE = z.strictObject({
  id: z.string().min(1),
  message: z.string().refine((text) => text.trim().length > 0),
});
const MESSAGES = z.array(MESSAGE).min(1);
const METADATA = z.strictObject({
  name: MESSAGE,
  description: MESSAGE,
  category: MESSAGE,
  tags: MESSAGES,
  useWhen: MESSAGE,
  prompt: MESSAGE,
  creativeDirection: MESSAGE,
  goodFor: MESSAGES,
  intent: MESSAGE,
  domains: MESSAGES,
  aliases: MESSAGES,
  notFor: MESSAGES,
  motionBeats: z.array(
    z
      .strictObject({
        startFrame: z.number().int().nonnegative(),
        endFrame: z.number().int().nonnegative(),
        description: MESSAGE,
      })
      .refine((beat) => beat.endFrame >= beat.startFrame),
  ),
  distinction: MESSAGE,
});

/** Validates authored YAML copy while preserving its stable translation IDs. */
export function parseStockMetadata(value: unknown): StockMetadata {
  return METADATA.parse(value);
}
