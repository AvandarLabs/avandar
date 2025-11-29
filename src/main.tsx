import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/charts/styles.css";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import {
  ModuleRegistry as AGGridModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AvaQueryClient } from "./config/AvaQueryClient";
import { AvaRouter } from "./config/AvaRouter";
import { AvaDexie } from "./db/dexie/AvaDexie";
import { useAuth } from "./lib/hooks/auth/useAuth";
import type { AvaRouterRootContext } from "@/config/AvaRouter";

AGGridModuleRegistry.registerModules([AllCommunityModule]);

// eslint-disable-next-line react-refresh/only-export-components
function MainWrapper() {
  const { user } = useAuth(AvaRouter);
  const context: AvaRouterRootContext = useMemo(() => {
    return { user, queryClient: AvaQueryClient };
  }, [user]);

  useEffect(() => {
    AvaDexie.syncDBVersion(user);
  }, [user]);

  return (
    <QueryClientProvider client={AvaQueryClient}>
      <RouterProvider router={AvaRouter} context={context} />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MainWrapper />
  </StrictMode>,
);
