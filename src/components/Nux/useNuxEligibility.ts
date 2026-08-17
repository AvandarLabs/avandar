import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { isDesktop } from "$/platform/isDesktop";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the onboarding tutorial may run for this user, here, now.
 *
 * Three conditions, all of which must hold:
 *
 *   1. Owner or Settings admin. Every milestone assumes create and share
 *      permissions, so an invited viewer would be walked into a wall. The
 *      experience for those users is deliberately empty for now and is
 *      tracked separately.
 *   2. Desktop width. Joyride spotlighting is unreliable on narrow viewports
 *      and the Data Explorer is already cramped there.
 *   3. Web, not the Electron shell, which has its own offline behaviour the
 *      flow has not been tested against.
 *
 * Conditions 2 and 3 suppress rather than degrade: shipping an untested flow
 * on a surface nobody designed for is worse than shipping nothing there.
 */
export function useNuxEligibility(): boolean {
  const theme = useMantineTheme();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const isGlobalAdmin = useIsGlobalAdmin();
  // `useMediaQuery` returns `undefined` on the first render before it has
  // measured, so this compares to `true` rather than trusting truthiness.
  const isDesktopWidth =
    useMediaQuery(`(min-width: ${theme.breakpoints.lg})`) === true;

  if (isDesktop() || !isDesktopWidth || !user) {
    return false;
  }
  return workspace.ownerId === user.id || isGlobalAdmin;
}
