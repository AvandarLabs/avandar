/** The shortest workspace slug the server accepts. */
export const WORKSPACE_SLUG_MIN_LENGTH = 3;

/** The longest workspace slug the server accepts. */
export const WORKSPACE_SLUG_MAX_LENGTH = 20;

/** Why a workspace slug fails the format rules, before any server check. */
export type WorkspaceSlugFormatProblem =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_characters";

/**
 * Checks a workspace slug against the same format rules the server enforces.
 * For example, a slug field's validator can use it to show a format error
 * before asking the server whether the slug is free.
 *
 * @returns The first problem found, or `undefined` if the format is valid.
 */
export function getWorkspaceSlugFormatProblem(
  slug: string,
): WorkspaceSlugFormatProblem | undefined {
  if (!slug) {
    return "empty";
  }
  if (slug.length < WORKSPACE_SLUG_MIN_LENGTH) {
    return "too_short";
  }
  if (slug.length > WORKSPACE_SLUG_MAX_LENGTH) {
    return "too_long";
  }
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    return "invalid_characters";
  }
  return undefined;
}
