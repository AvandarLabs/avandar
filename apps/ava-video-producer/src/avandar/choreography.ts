export type PointerBeat = {
  frame: number;
  x: number;
  y: number;
  action: string;
  holdUntil?: number;
};

/** Preserve a real dwell even when adjacent clicks are only 16 frames apart. */
export function measuredPath(beats: PointerBeat[], width = 1600, height = 840) {
  const keys = [{ at: 0, x: width * 0.42, y: height * 0.47 }];
  let previousHold = 0;
  for (const [index, beat] of beats.entries()) {
    if (beat.frame <= previousHold)
      throw new Error("Pointer beats overlap their click holds");
    const arrive = Math.min(
      beat.frame,
      Math.max(previousHold + 8, beat.frame - 12),
    );
    const hold = Math.max(
      beat.frame + 8,
      Math.min(beat.holdUntil ?? 0, (beats[index + 1]?.frame ?? Infinity) - 8),
    );
    keys.push(
      { at: arrive, x: beat.x, y: beat.y },
      { at: hold, x: beat.x, y: beat.y },
    );
    previousHold = hold;
  }
  return keys;
}
