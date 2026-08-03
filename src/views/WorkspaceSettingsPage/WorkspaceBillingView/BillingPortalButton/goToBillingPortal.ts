import { getCurrentUrl, navigateToExternalUrl } from "@browser-utils";
import { notifyError } from "@ui";
import { UserId } from "$/models/User/User.types";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";

export async function goToBillingPortal({
  userId,
}: {
  userId: UserId;
}): Promise<void> {
  try {
    const customerPortalResponse = await APIClient.get({
      route: "subscriptions/customer-portal/:userId",
      pathParams: {
        userId: userId,
      },
      queryParams: {
        returnURL: getCurrentUrl(),
      },
    });

    if (customerPortalResponse.success) {
      // Invalidate workspace data so it refetches with the
      // updated subscription when the user returns from the
      // billing portal.
      AvaQueryClient.invalidateQueries({
        queryKey: [WorkspaceClient.getClientName()],
      });
      navigateToExternalUrl(customerPortalResponse.customerPortalURL);
    } else {
      notifyError(
        "Billing portal cannot be loaded because you do not" +
          " have a subscription yet.",
      );
    }
  } catch {
    notifyError(
      "Unable to open the billing portal. Please try" + " again later.",
    );
  }
}
