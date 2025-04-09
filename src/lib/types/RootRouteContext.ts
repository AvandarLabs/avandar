import { User } from "@supabase/supabase-js";

export type RootRouteContext = {
  user: User | undefined;
};
