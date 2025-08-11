import { useQuery } from "@tanstack/react-query";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { SupabaseDBClient } from "@/lib/clients/supabase/SupabaseDBClient";
import { WorkspaceRole } from "@/models/Workspace/types";
import { useCurrentUser } from "../users/useCurrentUser";

export function useWorkspaceRole(): WorkspaceRole {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();

  const { data: role } = useQuery({
    queryKey: ["UserRoles", workspace?.id, user?.id],
    enabled: !!workspace?.id && !!user?.id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await SupabaseDBClient.from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("workspace_id", workspace!.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data?.role ?? "member";
    },
  });

  return (role ?? "member") as WorkspaceRole;
}
