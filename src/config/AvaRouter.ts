import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { AppErrorBoundary } from "@/components/AppErrorBoundary/AppErrorBoundary";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { routeTree } from "@/routeTree.gen";
import type { User } from "$/models/User/User";

export const AvaRouter = createRouter({
  routeTree,
  context: {
    user: undefined,
    queryClient: AvaQueryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  // Catch otherwise-fatal route errors (e.g. a `JWSError JWSInvalidSignature`
  // from a stale session) and recover gracefully instead of showing the
  // router's raw "Something went wrong" crash screen.
  defaultErrorComponent: AppErrorBoundary,
});

export type AvaRouterRootContext = {
  user: User.T | undefined;
  queryClient: QueryClient;
};

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof AvaRouter;
  }
}
