/**
 * Returns whether the current platform is a Mac or iOS device. Returns `false`
 * when `navigator` is unavailable (e.g. during server-side rendering).
 */
export function getIsMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  // Prefer the modern User-Agent Client Hints API and fall back to the
  // userAgent string when it is unavailable.
  const userAgentData = (
    navigator as Navigator & {
      userAgentData?: { platform: string };
    }
  ).userAgentData;

  if (userAgentData?.platform) {
    return /Mac|iPhone|iPod|iPad/iu.test(userAgentData.platform);
  }

  return /Mac|iPhone|iPod|iPad/iu.test(navigator.userAgent);
}
