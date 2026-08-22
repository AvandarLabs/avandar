import type { AvaRouterRootContext } from "@/config/AvaRouter";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";

/**
 * This is the root route of the app. It only renders the <App> component.
 */
export const Route = createRootRouteWithContext<AvaRouterRootContext>()({
  component: RouterRootComponent,
});

function RouterRootComponent() {
  return (
    <AvandarAppProvider>
      <Outlet />
      {import.meta.env.VITE_HIDE_DEV_TOOLS === "true" ? null : (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </AvandarAppProvider>
  );
}
