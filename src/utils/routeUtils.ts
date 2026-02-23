const INVALID_REDIRECT_PATHS = ["/invalid-workspace"];

/**
 * A redirect is considered valid if:
 * - it is an internal URL
 * - it is not a redirect to "/invalid-workspace"
 * @param redirect - The redirect URL to check
 * @returns True if the redirect is valid, false otherwise
 */
export function isValidRedirectPath(redirectPath: string): boolean {
  return (
    redirectPath.startsWith("/") &&
    !INVALID_REDIRECT_PATHS.includes(redirectPath)
  );
}
