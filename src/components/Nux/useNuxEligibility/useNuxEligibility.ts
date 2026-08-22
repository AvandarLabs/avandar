import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { isDesktop } from "$/platform/isDesktop";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the onboarding tutorial may run for this user, here, now.
 *
 * Four conditions, all of which must hold:
 *
 *   1. Owner or Settings admin. Every milestone assumes create and share
 *      permissions, so an invited viewer would be walked into a wall. The
 *      experience for those users is deliberately empty for now and is
 *      tracked separately.
 *   2. Desktop width. Joyride spotlighting is unreliable on narrow viewports
 *      and the Data Explorer is already cramped there.
 *   3. Web, not the Electron shell, which has its own offline behaviour the
 *      flow has not been tested against.
 *   4. An entitled plan. New workspaces open a blocking "Select your plan"
 *      modal first; the tutorial invite must wait until that is done, or
 *      the two stack. This hook lives under the workspace layout, so a
 *      workspace already exists by the time it runs.
 *
 * Conditions 2 and 3 suppress rather than degrade: shipping an untested flow
 * on a surface nobody designed for is worse than shipping nothing there.
 */
export function useNuxEligibility(): boolean {
  const theme = useMantineTheme();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const isGlobalAdmin = useIsGlobalAdmin();
  // `useMediaQuery` hands back `undefined` on the first render, before it has
  // measured, even though Mantine types the return as `boolean`. Comparing to
  // `true` rather than trusting truthiness is what keeps that pre-measurement
  // render from counting as a desktop viewport. The case cannot be unit-tested
  // without an escape-hatch cast, because the declared type denies it.
  const isDesktopWidth =
    useMediaQuery(`(min-width: ${theme.breakpoints.lg})`) === true;
  const hasChosenPlan = SubscriptionModule.doesSubscriptionGrantEntitlements(
    workspace.subscription,
  );

  return (
    !isDesktop() &&
    isDesktopWidth &&
    user !== undefined &&
    hasChosenPlan &&
    (workspace.ownerId === user.id || isGlobalAdmin)
  );
}
