import { useRouteContext } from "@tanstack/react-router";
import { RootRouteContext } from "@/lib/types/RootRouteContext";

export function useCurrentUser(): RootRouteContext["user"] {
  const { user } = useRouteContext({ from: "__root__" });
  return user;
}
