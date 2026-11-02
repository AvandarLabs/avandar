/**
 * Stable authored arc coordinates keep socket order independent of the holder.
 */
export function getSocketPointFromIndex({
  index,
  numParticipants,
}: Readonly<{ index: number; numParticipants: number }>): {
  x: number;
  y: number;
} {
  const fraction = index / (numParticipants - 1);
  return {
    x: 180 + fraction * 600,
    y: 270 - Math.sin(fraction * Math.PI) * 70,
  };
}
