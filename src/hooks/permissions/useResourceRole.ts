import { useQuery } from "@hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import { permissionsQueryKeys } from "@/hooks/permissions/permissionsQueryKeys";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import type { Database } from "$/types/database.types";

export type ResourceTypeForRole = Database["public"]["Enums"]["resource_type"];

/**
 * Effective role for the signed-in user on a dashboard or dataset row.
 *
 * @param options.resourceType Resource kind for SQL resolution.
 * @param options.resourceId Primary key of the resource.
 * @returns Tuple of role (null when RPC reports no access), loading flag.
 */
export function useResourceRole(options: {
  resourceType: ResourceTypeForRole;
  resourceId: string | undefined;
}): readonly [
  Database["public"]["Enums"]["role_level"] | null | undefined,
  boolean,
] {
  const user = useCurrentUser();
  const { resourceType, resourceId } = options;

  const [data, isLoading] = useQuery({
    queryKey: permissionsQueryKeys.resourceEffectiveRole(
      resourceType,
      resourceId ?? "",
    ),
    enabled: !!resourceId && !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: role, error } = await AvaSupabase.db().rpc(
        "util__resource_effective_role",
        {
          p_resource_type: resourceType,
          p_resource_id: resourceId!,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      return role;
    },
  });

  return [data, isLoading] as const;
}
