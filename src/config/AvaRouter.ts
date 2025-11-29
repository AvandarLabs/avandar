import { User } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { routeTree } from "@/routeTree.gen";

export const AvaRouter = createRouter({
  routeTree,
  context: {
    user: undefined,
    queryClient: AvaQueryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

export type AvaRouterRootContext = {
  user: User | undefined;
  queryClient: QueryClient;
};

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof AvaRouter;
  }
}
