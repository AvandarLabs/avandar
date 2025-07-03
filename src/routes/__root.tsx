import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { cssVariablesResolver, Theme } from "@/config/Theme";
import { RootRouteContext } from "@/lib/types/RootRouteContext";

/**
 * This is the root route of the app. It only renders the <App> component.
 */
export const Route = createRootRouteWithContext<RootRouteContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <MantineProvider theme={Theme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <Outlet />
        {import.meta.env.VITE_HIDE_DEV_TOOLS === "true" ? null : (
          <TanStackRouterDevtools />
        )}
      </ModalsProvider>
    </MantineProvider>
  );
}
