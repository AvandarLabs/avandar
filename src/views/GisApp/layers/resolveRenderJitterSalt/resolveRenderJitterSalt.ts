/**
 * The salt to draw a live map with. An editor gets the map's own salt, so the
 * live map matches what a publish would show. A viewer who cannot edit the
 * map cannot read that salt, so they get a fresh random one: a live map is
 * only drawn for a viewer who can already read its datasets' exact rows, so a
 * throwaway salt reveals nothing they could not already see.
 *
 * @param mapJitterSalt The map's salt, or undefined when the viewer cannot
 * edit the map.
 * @returns The salt to displace the map's jittered points with.
 */
export function resolveRenderJitterSalt(
  mapJitterSalt: string | undefined,
): string {
  return mapJitterSalt ?? crypto.randomUUID();
}
