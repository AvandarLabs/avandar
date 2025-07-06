import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthClient } from "@/clients/AuthClient";
import { AppLinks } from "@/config/AppLinks";

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
      throw redirect({
        to: AppLinks.signin.to,
        search: {
          // Use the current location to power a redirect after login
          // (Do not use `router.state.resolvedLocation` as it can potentially
          // lag behind the actual current location.
          redirect: location.href,
        },
      });
    }
  },
});

function MainAppRootLayout() {
  return <Outlet />;
}
