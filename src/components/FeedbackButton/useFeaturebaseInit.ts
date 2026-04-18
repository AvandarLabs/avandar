import { useQuery } from "@hooks/useQuery/useQuery";
import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps";
import { useEffect } from "react";
import { APIClient } from "@/clients/APIClient";
import { Route as RootRoute } from "@/routes/__root";

/**
 * Initializes Featurebase functionality.
 * The root `index.html` loads the Featurebase SDK asynchronously.
 */
export function useFeaturebaseInit(): void {
  const { user } = RootRoute.useRouteContext();
  const [jwtResponse] = useQuery({
    queryKey: ["support", "featurebase-jwt", user?.id],
    queryFn: async () => {
      return await APIClient.get({
        route: "support/featurebase-jwt",
      });
    },
    enabled: user !== undefined && hasDefinedProps(user, "email"),
  });

  useEffect(
    function initializeFeaturebaseSDK() {
      const { featurebaseJWT } = jwtResponse ?? {};
      if (!user || !featurebaseJWT) {
        return;
      }

      // Embed missing (e.g. tests) — production HTML always defines a function.
      if (
        !("Featurebase" in window) ||
        typeof window.Featurebase !== "function"
      ) {
        return;
      }

      window.Featurebase("initialize_feedback_widget", {
        organization: "avandar",
        theme: "light",
        locale: "en",

        // Attach session-specific metadata to feedback.
        // Refer to the advanced section for the details:
        // https://help.featurebase.app/en/articles/3774671-advanced#7k8iriyap66
        metadata: null,
        featurebaseJwt: featurebaseJWT,
      });
    },
    [jwtResponse, user],
  );
}
