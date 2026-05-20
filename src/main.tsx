import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/charts/styles.css";
import "@/config/Theme/animationPresets.css";
import "@/index.css";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "@tanstack/react-router";
import {
  ModuleRegistry as AGGridModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { AvaRouter } from "@/config/AvaRouter";
import { PlatformProvider } from "@/config/platform/PlatformProvider";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { makeCacheBuster, queryPersister } from "@/lib/offline/queryPersister";
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
    <PersistQueryClientProvider
      client={AvaQueryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        buster: makeCacheBuster(user?.id),
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        },
      }}
    >
      <RouterProvider router={AvaRouter} context={context} />
    </PersistQueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformProvider>
      <MainWrapper />
    </PlatformProvider>
  </StrictMode>,
);
