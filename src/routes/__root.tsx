import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import type { AvaRouterRootContext } from "@/config/AvaRouter";

/**
 * This is the root route of the app. It only renders the <App> component.
 */
export const Route = createRootRouteWithContext<AvaRouterRootContext>()({
  component: RouterRootComponent,
});

function RouterRootComponent() {
  return (
    <AvandarUiProvider>
      <Outlet />
      {import.meta.env.VITE_HIDE_DEV_TOOLS === "true" ? null : (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </AvandarUiProvider>
  );
}
