import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { AppLinks } from "@/config/AppLinks";
import { isValidRedirectPath } from "@/utils/isValidRedirectPath/isValidRedirectPath";

export const Route = createFileRoute("/_auth")({
  component: MainAppRootLayout,

  /**
   * Before loading any page hidden behind auth, we check if the user is
   * logged in. If not, redirect to the `/signin` page.
   */
  beforeLoad: async ({ location }) => {
    // The `user` in the root context in main.tsx is not set yet
    // in the initial load, so we need to call AuthClient directly
    // to check if the user is authenticated.
    const session = await AuthClient.getCurrentSession();

    if (!session?.user) {
      // check if we are trying to access the `/invites/` route
      if (location.pathname.includes("/invites/")) {
        // if so, then we need to redirect to the `/register` page, but add a
        // a param to redirect back to the invite page after registration
        throw redirect({
          to: "/register",
          search: { redirect: location.href },
        });
      }

      // If there is no user session, then we want to set the current URL
      // as a redirect search param, so the user can be redirected to it
      // after sign-in. But we do not want to do this if the user had manually
      // triggered a sign-out. We only want it if the session had expired.
      const shouldRedirect =
        !AuthClient.isManuallySignedOut() && isValidRedirectPath(location.href);

      AuthClient.resetManualSignOut();

      throw redirect({
        to: AppLinks.signin.to,

        ...(shouldRedirect ?
          {
            search: {
              // Use the current location to power a redirect after login
              // (Do not use `router.state.resolvedLocation` as it can
              // potentially lag behind the actual current location.
              redirect: location.href,
            },
          }
        : {}),
      });
    }
  },
});

function MainAppRootLayout() {
  return <Outlet />;
}
