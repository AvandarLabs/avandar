import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AvandarUIProvider } from "@/components/common/AvandarUIProvider";
import type { AvaRouterRootContext } from "@/config/AvaRouter";

/**
 * This is the root route of the app. It only renders the <App> component.
 */
export const Route = createRootRouteWithContext<AvaRouterRootContext>()({
  component: RouterRootComponent,
});

function RouterRootComponent() {
  return (
    <AvandarUIProvider>
      <Outlet />
      {import.meta.env.VITE_HIDE_DEV_TOOLS === "true" ? null : (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </AvandarUIProvider>
  );
}
