import { User } from "@supabase/supabase-js";
import { AnyRouter } from "@tanstack/router-core";
import { useEffect, useState } from "react";
import { AuthClient } from "@/clients/AuthClient";

/**
 * This function should be called from the root component of the app.
 * It will return the current user and subscribes to auth state changes.
 * If the auth state changes, it invalidates the router and recomputes
 * the routes so that the appropriate page can load.
 *
 * @returns The current user or undefined if the user is not authenticated
 */
export function useAuth(router: AnyRouter): { user: User | undefined } {
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const getSession = async () => {
      const currentSession = await AuthClient.getCurrentSession();
      setUser(currentSession?.user ?? undefined);
      router.invalidate();
    };

    getSession();

    const subscription = AuthClient.onAuthStateChange(
      async (_event, newSession) => {
        setUser(newSession?.user ?? undefined);
        router.invalidate();
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return { user };
}
