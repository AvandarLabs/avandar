import { Route as AuthRoute } from "@/routes/_auth/route";

export type AuthUser = ReturnType<typeof AuthRoute.useRouteContext>["user"];

export function useAuthUser(): AuthUser {
  const { user } = AuthRoute.useRouteContext();
  return user;
}
