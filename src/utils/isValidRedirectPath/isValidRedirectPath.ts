const INVALID_REDIRECT_PATHS = ["/invalid-workspace"];

/**
 * A redirect is considered valid if:
 * - it is an internal URL
 * - it does not start with any of the paths in INVALID_REDIRECT_PATHS
 * @param redirectPath - The redirect URL to check
 * @returns True if the redirect is valid, false otherwise
 */
export function isValidRedirectPath(redirectPath: string): boolean {
  return (
    redirectPath.startsWith("/") &&
    INVALID_REDIRECT_PATHS.every((invalidPath) => {
      return !redirectPath.startsWith(invalidPath);
    })
  );
}
