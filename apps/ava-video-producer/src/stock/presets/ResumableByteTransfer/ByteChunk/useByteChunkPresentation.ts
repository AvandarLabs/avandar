import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { TransferChunk } from "../getByteTransferFromFrame";
import type { Input } from "../ResumableByteTransfer.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  chunk: TransferChunk;
  input: Input;
  frame: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  chunk: Options["chunk"];
  input: Options["input"];
  accent: Options["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  width: number;
  y: number;
};

/**
 * Returns byte chunk position, width, and theme values for `ByteChunk`,
 * `ByteChunkBody`.
 */
export function useByteChunkPresentation({
  chunk,
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 84 + (chunk.start / input.file.sizeBytes) * 792;
  const width = ((chunk.end - chunk.start) / input.file.sizeBytes) * 792;
  const interruptedY =
    frame <= 73
      ? Motion.mix({
          t: motion.ramp(frame, 56, motion.scale(17), motion.travel.easing),
          from: 180,
          to: 275,
        })
      : Motion.mix({
          t: motion.ramp(frame, 73, motion.scale(17), motion.travel.easing),
          from: 275,
          to: 180,
        });
  const y = chunk.isInterrupted
    ? interruptedY
    : Motion.mix({ t: chunk.progress, from: 180, to: 380 });
  return { chunk, input, accent, atomic, tokens, scales, x, width, y };
}
