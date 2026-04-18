import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SignJWT } from "jsr:@panva/jose@6";
import { z } from "zod";
import type { SupportAPI } from "@sbfn/support/support.routes.types.ts";
import type { User } from "@supabase/supabase-js";

const UserMetadataSchema = z.object({
  full_name: z.string().optional(),
  avatar_url: z.string().optional(),
});

type FeaturebaseCompany = {
  name: string;
  id: string;
  Slug: string;
  plan?: string;
};

/**
 * Signs a Featurebase identity JWT. Never expose the secret to the client.
 *
 * @param workspaces Membership workspaces, sent as Featurebase `companies`
 * when non-empty.
 */
async function _generateFeaturebaseJWT(
  user: User,
  workspaces: readonly FeaturebaseCompany[],
): Promise<string> {
  const jwtSecret = Deno.env.get("FEATUREBASE_JWT_SECRET");
  if (!jwtSecret) {
    throw new Error("FEATUREBASE_JWT_SECRET is not configured.");
  }
  const secretKey = new TextEncoder().encode(jwtSecret);
  const userMetadata = UserMetadataSchema.parse(user.user_metadata);
  if (!user.email) {
    throw new Error("User email is required for Featurebase JWT.");
  }

  const userData: Record<string, unknown> = {
    name: userMetadata.full_name ?? user.email,
    email: user.email,
    userId: user.id,
    profilePicture: userMetadata.avatar_url,
    companies: workspaces,
  };

  return await new SignJWT(userData)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey);
}

/**
 * This is the route handler for all support endpoints.
 */
export const Routes = defineRoutes<SupportAPI>("support", {
  "/featurebase-jwt": {
    GET: GET("/featurebase-jwt").action(async ({ user, supabaseClient }) => {
      const { data: memberships } = await supabaseClient
        .from("workspace_memberships")
        .select(
          "workspace:workspaces (id, name, slug, subscription:subscriptions (feature_plan_type))",
        )
        .eq("user_id", user.id)
        .throwOnError();

      const workspaces = memberships.map((row) => {
        const workspace = row.workspace;
        const plan =
          workspace.subscription != null ?
            workspace.subscription.feature_plan_type
          : "free";

        return {
          name: workspace.name,
          id: workspace.id,
          Slug: workspace.slug,
          plan,
        };
      });

      const featurebaseJWT = await _generateFeaturebaseJWT(user, workspaces);
      return { featurebaseJWT };
    }),
  },
});
