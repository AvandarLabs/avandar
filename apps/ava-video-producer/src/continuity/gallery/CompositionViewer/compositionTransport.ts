/** Controlled playback preferences retained across active film changes. */
export type CompositionTransport = { speed: number; loop: boolean };
/** Synchronize only mismatched playback values after a player starts or reloads. */
export function getCompositionTransportUpdates(
  desired: CompositionTransport,
  actual: unknown,
) {
  const current = typeof actual === "object" && actual !== null ? actual : {};
  return [
    ...(!("speed" in current) || current.speed !== desired.speed
      ? [{ action: "speed", value: desired.speed }]
      : []),
    ...(!("loop" in current) || current.loop !== desired.loop
      ? [{ action: "loop", value: desired.loop }]
      : []),
  ];
}
