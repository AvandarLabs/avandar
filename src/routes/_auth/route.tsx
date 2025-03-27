import { createFileRoute, redirect } from "@tanstack/react-router";
import { App } from "@/components/App";
import { AuthService } from "@/services/AuthService";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,

  /**
   * Before loading any page hidden behind auth, we check if the user is
   * logged in. If not, we redirect to the /signin page.
   */
  beforeLoad: async ({ location }) => {
    const session = await AuthService.getCurrentSession();
    if (!session?.user) {
      throw redirect({
        to: "/signin",
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

function RouteComponent() {
  return <App />;
}
