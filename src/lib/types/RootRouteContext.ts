import { QueryClient } from "@tanstack/react-query";
import { User } from "@/models/User/User.types";

export type RootRouteContext = {
  user: User | undefined;
  queryClient: QueryClient;
};
