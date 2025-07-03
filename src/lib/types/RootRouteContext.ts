import { User } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";

export type RootRouteContext = {
  user: User | undefined;
  queryClient: QueryClient;
};
