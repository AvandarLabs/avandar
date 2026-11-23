/** Resolves plural spellings only for real inventory commands. */
export function getCanonicalCommandFromName(name) {
  return ["motions", "captures"].includes(name) ? name.slice(0, -1) : name;
}
