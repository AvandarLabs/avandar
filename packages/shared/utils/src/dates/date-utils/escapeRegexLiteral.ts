/**
 * Escapes a string for use inside a `RegExp` source (outside character class).
 */
export function escapeRegexLiteral(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
