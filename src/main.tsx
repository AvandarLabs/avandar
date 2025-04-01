import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useAuth } from "./hooks/auth/useAuth";
import { routeTree } from "./routeTree.gen";
import { RootRouteContext } from "./types/RootRouteContext";

ModuleRegistry.registerModules([AllCommunityModule]);

const router = createRouter({
  routeTree,
  context: {
    user: undefined,
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

function MainWrapper() {
  const user = useAuth(router);
  const context: RootRouteContext = useMemo(() => {
    return { user };
  }, [user]);
  return <RouterProvider router={router} context={context} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MainWrapper />
  </StrictMode>,
);
