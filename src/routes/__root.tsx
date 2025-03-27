import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { RootRouteContext } from "@/types/RootRouteContext";

const QUERY_CLIENT = new QueryClient();

/**
 * This is the root route of the app. It only renders the <App> component.
 */
export const Route = createRootRouteWithContext<RootRouteContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={QUERY_CLIENT}>
      <MantineProvider>
        <Notifications />
        <Outlet />
      </MantineProvider>
    </QueryClientProvider>
  );
}
