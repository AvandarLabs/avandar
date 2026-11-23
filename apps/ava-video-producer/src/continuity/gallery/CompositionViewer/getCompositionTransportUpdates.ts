/** Controlled playback preferences retained across active film changes. */
export type CompositionTransport = {
  speed: number;
  loop: boolean;
};
/** One player control message that brings a playback value in line. */
type CompositionTransportUpdate =
  | {
      action: string;
      value: number;
    }
  | {
      action: string;
      value: boolean;
    };
/**
 * Synchronize only mismatched playback values after a player starts or reloads.
 */
export function getCompositionTransportUpdates({
  desired,
  actual,
}: Readonly<{
  desired: CompositionTransport;
  actual: unknown;
}>): CompositionTransportUpdate[] {
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
