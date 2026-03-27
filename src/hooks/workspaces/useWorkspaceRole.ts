import { useQuery } from "@hooks/useQuery/useQuery";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import type { Workspace } from "$/models/Workspace/Workspace";

export function useWorkspaceRole(): Workspace.Role {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();

  const [role] = useQuery({
    queryKey: ["UserRoles", workspace?.id, user?.id],
    enabled: !!workspace?.id && !!user?.id,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await AvaSupabase.DB.from("user_roles")
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

  return (role ?? "member") as Workspace.Role;
}
