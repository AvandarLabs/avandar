import { Route as AuthRoute } from "@/routes/_auth/route";

type CurrentUser = ReturnType<typeof AuthRoute.useRouteContext>["user"];

export function useCurrentUser(): CurrentUser {
  const { user } = AuthRoute.useRouteContext();
  return user;
}
