import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/charts/styles.css";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useCurrentUser } from "./lib/hooks/auth/useCurrentUser";
import { RootRouteContext } from "./lib/types/RootRouteContext";
import { routeTree } from "./routeTree.gen";

ModuleRegistry.registerModules([AllCommunityModule]);

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    user: undefined,
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
function MainWrapper() {
  const user = useCurrentUser(router);
  const context: RootRouteContext = useMemo(() => {
    return { user, queryClient };
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={context} />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MainWrapper />
  </StrictMode>,
);
