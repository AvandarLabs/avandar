/**
 * Dedicated Playwright accounts (not `user@avandarlabs.com` used by dev seed).
 * Worker fixtures create these users once per worker and remove them at
 * shutdown when credentials are available.
 */
export const E2E_PRIMARY_USER_EMAIL = "test-user@avandarlabs.com";
export const E2E_SECONDARY_USER_EMAIL = "test-user2@avandarlabs.com";
export const E2E_TEST_USER_PASSWORD = "avandar";

/**
 * Workspace slug prefix; the worker index is appended (`-w0`, …) so parallel
 * workers never collide.
 */
export const E2E_WORKSPACE_SLUG_BASE = "e2e-test-workspace";
