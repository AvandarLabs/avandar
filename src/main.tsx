import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/charts/styles.css";
import "@/index.css";
import { RouterProvider } from "@tanstack/react-router";
import {
  ModuleRegistry as AGGridModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AvandarQueryClientProvider } from "@/components/providers/AvandarQueryClientProvider/AvandarQueryClientProvider";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { AvaRouter } from "@/config/AvaRouter";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { useAuth } from "@/hooks/auth/useAuth";
import { AvandarI18nProvider } from "@/i18n/AvandarI18nProvider";
import { registerOfflineServiceWorker } from "@/lib/offline/registerServiceWorker";
import type { AvaRouterRootContext } from "@/config/AvaRouter";

AGGridModuleRegistry.registerModules([AllCommunityModule]);

registerOfflineServiceWorker();

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
    <AvandarI18nProvider>
      <AvandarQueryClientProvider userId={user?.id}>
        <RouterProvider router={AvaRouter} context={context} />
      </AvandarQueryClientProvider>
    </AvandarI18nProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MainWrapper />
  </StrictMode>,
);
