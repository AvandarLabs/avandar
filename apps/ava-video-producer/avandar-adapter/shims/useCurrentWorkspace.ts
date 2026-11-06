const workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "avandar-labs",
  name: "Avandar Labs",
};

/** Film-only workspace identity. Product services are never contacted while rendering. */
export function useCurrentWorkspace() {
  return workspace;
}
