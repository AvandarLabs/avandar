import { useQuery } from "@tanstack/react-query";
import { SupabaseDBClient } from "@/lib/clients/supabase/SupabaseDBClient";
import { WorkspaceRole } from "@/models/Workspace/types";
import { useCurrentUser } from "../users/useCurrentUser";
import { useCurrentWorkspace } from "./useCurrentWorkspace";

type UserRoleWithMembership = {
  role: WorkspaceRole;
  workspace_memberships: { id: string; workspace_id: string; user_id: string };
};

export function useWorkspaceRole(): WorkspaceRole {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();

  const { data: role } = useQuery({
    queryKey: ["UserRoles", workspace?.id, user?.id],
    enabled: !!workspace?.id && !!user?.id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await SupabaseDBClient.from("user_roles")
        .select("role, workspace_memberships!inner(id, workspace_id, user_id)")
        .eq("workspace_memberships.workspace_id", workspace!.id)
        .eq("workspace_memberships.user_id", user!.id)
        .limit(1)
        .maybeSingle<UserRoleWithMembership>();

      if (error) throw error;
      return (data?.role ?? "member") as WorkspaceRole;
    },
  });

  return (role ?? "member") as WorkspaceRole;
}
