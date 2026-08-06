/** Dev-only logging for offline chat SQL hardening (grep: `[offlineChat]`). */
export function devLogOfflineChat(
  label: string,
  payload?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) {
    return;
  }
  if (payload === undefined) {
    console.log(`[offlineChat] ${label}`);
    return;
  }
  console.log(`[offlineChat] ${label}`, payload);
}
