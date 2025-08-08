import { User } from "@supabase/supabase-js";
import { Route as AuthRoute } from "@/routes/_auth/route";

export function useCurrentUser(): User | undefined {
  const { user } = AuthRoute.useRouteContext();
  return user;
}
