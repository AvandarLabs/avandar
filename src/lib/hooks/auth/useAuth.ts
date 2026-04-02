import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps";
import { useEffect, useRef, useState } from "react";
import { AuthClient } from "@/clients/AuthClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { AnyRouter } from "@tanstack/react-router";
import type { User } from "$/models/User/User";

/**
 * This function should be called from the root component of the app.
 * It will return the current user and subscribes to auth state changes.
 * If the auth state changes, it invalidates the router and recomputes
 * the routes so that the appropriate page can load.
 *
 * @returns The current user or undefined if the user is not authenticated
 */
export function useAuth(router: AnyRouter): { user: User.T | undefined } {
  const [user, setUser] = useState<SupabaseUser | undefined>(undefined);
  const pendingRedirectRef = useRef<string | null>(null);
  const hadUserRef = useRef(false);

  useEffect(() => {
    const getSession = async () => {
      const currentSession = await AuthClient.getCurrentSession();
      setUser(currentSession?.user ?? undefined);
    };

    getSession();

    const subscription = AuthClient.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        const currentLocation = router.state.location;
        const searchParams = new URLSearchParams(currentLocation.search);
        const redirectParam = searchParams.get("redirect");
        if (redirectParam) {
          pendingRedirectRef.current = redirectParam;
        }
      }
      setUser(newSession?.user ?? undefined);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (user === undefined) {
      // Only invalidate on sign-out, not on the initial mount before
      // the session check has resolved (user starts as undefined)
      if (hadUserRef.current) {
        hadUserRef.current = false;
        router.invalidate();
      }
      return;
    }
    hadUserRef.current = true;

    // Invalidate workspace cache on sign-in so the incoming user always
    // gets fresh workspace data (prevents stale data from a prior user)
    AvaQueryClient.invalidateQueries({
      queryKey: [WorkspaceClient.getClientName()],
    });
    if (pendingRedirectRef.current) {
      const redirect = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      router.navigate({ to: redirect });
    }
    router.invalidate();
  }, [user, router]);

  if (user && hasDefinedProps(user, "email")) {
    return { user: user as User.T };
  }
  return { user: undefined };
}
