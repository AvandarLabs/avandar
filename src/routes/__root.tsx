import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { AppI18nProvider } from "@/i18n/AppI18nProvider";
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
      <AppI18nProvider>
        <Outlet />
      </AppI18nProvider>
      {import.meta.env.VITE_HIDE_DEV_TOOLS === "true" ? null : (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </AvandarUiProvider>
  );
}
