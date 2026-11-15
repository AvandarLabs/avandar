export type PointerBeat = {
  frame: number;
  x: number;
  y: number;
  action: string;
  holdUntil?: number;
};

function _coalesceSameTarget(beats: PointerBeat[]): PointerBeat[] {
  return beats.reduce<PointerBeat[]>((groups, beat) => {
    const previous = groups.at(-1);
    if (
      !previous ||
      beat.frame <= previous.frame ||
      beat.frame > Math.max(previous.frame + 8, previous.holdUntil ?? 0) ||
      beat.x !== previous.x ||
      beat.y !== previous.y
    )
      return [...groups, beat];
    return [
      ...groups.slice(0, -1),
      {
        ...previous,
        holdUntil: Math.max(
          beat.frame + 8,
          beat.holdUntil ?? 0,
          previous.holdUntil ?? 0,
        ),
      },
    ];
  }, []);
}

/** Preserve a real dwell even when adjacent clicks are only 16 frames apart. */
export function measuredPath(beats: PointerBeat[], width = 1600, height = 840) {
  const targets = _coalesceSameTarget(beats);
  const keys = [{ at: 0, x: width * 0.42, y: height * 0.47 }];
  let previousHold = 0;
  for (const [index, beat] of targets.entries()) {
    if (beat.frame <= previousHold)
      throw new Error("Pointer beats overlap their click holds");
    const arrive = Math.min(
      beat.frame,
      Math.max(previousHold + 8, beat.frame - 12),
    );
    const hold = Math.max(
      beat.frame + 8,
      Math.min(
        beat.holdUntil ?? 0,
        (targets[index + 1]?.frame ?? Infinity) - 8,
      ),
    );
    keys.push(
      { at: arrive, x: beat.x, y: beat.y },
      { at: hold, x: beat.x, y: beat.y },
    );
    previousHold = hold;
  }
  return keys;
}
