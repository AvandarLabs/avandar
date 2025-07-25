import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { SupabaseDBClient } from "@/lib/clients/supabase/SupabaseDBClient";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { routeTree } from "@/routeTree.gen";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    user: undefined,
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

export function useWorkspaceRole(): JSX.Element {
  const { user } = useAuth(router);
  const workspace = useCurrentWorkspace();

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !workspace?.id) return;

    const fetchRole = async () => {
      const { data, error } = await SupabaseDBClient.from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace.id)
        .single();

      if (data?.role) {
        setRole(data.role);
      } else {
        console.error("Failed to get role:", error);
      }
    };

    fetchRole();
  }, [user?.id, workspace?.id]);

  return role;
}
