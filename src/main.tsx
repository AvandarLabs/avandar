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
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AvaDexie } from "./db/dexie/AvaDexie";
import { useAuth } from "./lib/hooks/auth/useAuth";
import { RootRouteContext } from "./lib/types/RootRouteContext";
import { routeTree } from "./routeTree.gen";

ModuleRegistry.registerModules([AllCommunityModule]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Minimize surprise refetching and heavy local work (with DuckDB)
      // Queries that can benefit from refetching should be explicitly set.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,

      // Only fetch on mount if the query is stale or not in the cache
      refetchOnMount: true,

      // Performance/cache
      staleTime: 6 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes

      // Avoids duplicate error toasts from retries in dev
      retry: 0,
    },
    mutations: {
      // Many mutations are not idempotent and so we should not automatically
      // retry them. Retries should be explicit.
      retry: 0,
    },
  },
});

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
  const { user } = useAuth(router);
  const context: RootRouteContext = useMemo(() => {
    return { user, queryClient };
  }, [user]);

  useEffect(() => {
    AvaDexie.syncDBVersion(user);
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
