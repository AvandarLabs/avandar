import { QueryClient } from "@tanstack/react-query";
import { createRouter, ToOptions } from "@tanstack/react-router";
import { User } from "@/models/User/User.types";
import { routeTree } from "../routeTree.gen";
import { AvaQueryClient } from "./AvaQueryClient";

export const AvaRouter = createRouter({
  routeTree,
  context: {
    user: undefined,
    queryClient: AvaQueryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof AvaRouter;
  }
}

export type AvaRouterRootContext = {
  user: User | undefined;
  queryClient: QueryClient;
};

export type AvaRoutePaths = Exclude<
  ToOptions<typeof AvaRouter>["to"],
  undefined | "." | ".."
>;
