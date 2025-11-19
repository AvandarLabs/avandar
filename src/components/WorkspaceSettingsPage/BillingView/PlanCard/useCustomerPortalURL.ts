import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { assertIsDefined } from "@/lib/utils/asserts";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import type { UseQueryResultTuple } from "@/lib/hooks/query/useQuery";

export function useCustomerPortalURL(): UseQueryResultTuple<string> {
  const user = useCurrentUser();
  const userId = user?.id;
  return useQuery({
    queryKey: ["subscriptions", "customer-portal-url", userId],
    queryFn: async () => {
      assertIsDefined(
        userId,
        "User ID is required to get the customer portal URL",
      );
      const { customerPortalURL } = await APIClient.get({
        route: "subscriptions/customer-portal/:userId",
        pathParams: {
          userId: userId,
        },
        queryParams: {
          returnURL: getCurrentURL(),
        },
      });
      return customerPortalURL;
    },
    enabled: !!userId,
  });
}
