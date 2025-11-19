import { hasDefinedProps } from "@/lib/utils/guards/guards";
import { User } from "@/models/User/User.types";
import { Route as AuthRoute } from "@/routes/_auth/route";

/**
 * Get the current authenticated user.
 *
 * Since Avandar requires all users have an email, we also check that an `email`
 * is set before returning the user. If, for some reason, there is no email,
 * then we return undefined.
 *
 * @returns The current user or undefined if not authenticated.
 */
export function useCurrentUser(): User | undefined {
  const { user } = AuthRoute.useRouteContext();
  if (user && hasDefinedProps(user, "email")) {
    return user;
  }
  return undefined;
}
