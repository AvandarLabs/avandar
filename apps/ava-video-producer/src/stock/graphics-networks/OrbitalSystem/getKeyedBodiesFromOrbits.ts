import type { OrbitalSystemInput } from "../../presets/OrbitalSystem/OrbitalSystem.schema";

/**
 * Supplies OrbitalSystem with frame-specific rendering geometry or progress.
 */
export function getKeyedBodiesFromOrbits(
  bodies: ReadonlyArray<OrbitalSystemInput["bodies"][number]>,
): Array<{ key: string; orbit: OrbitalSystemInput["bodies"][number] }> {
  const bodySignatureCounts = new Map<string, number>();
  return bodies.map((orbit) => {
    const signature = `${orbit.label}:${orbit.rx}:${orbit.ry}:${orbit.angle}:${orbit.phase}`;
    const occurrence = bodySignatureCounts.get(signature) ?? 0;
    bodySignatureCounts.set(signature, occurrence + 1);
    return { key: `${signature}#${occurrence}`, orbit };
  });
}
