import { notifyError } from "@ui/notifications/notify";
import { UserId } from "$/models/User/User.types";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";

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
        returnURL: getCurrentURL(),
      },
    });

    if (customerPortalResponse.success) {
      // Invalidate workspace data so it refetches with the
      // updated subscription when the user returns from the
      // billing portal.
      AvaQueryClient.invalidateQueries({
        queryKey: [WorkspaceClient.getClientName()],
      });
      navigateToExternalURL(
        customerPortalResponse.customerPortalURL,
      );
    } else {
      notifyError(
        "Billing portal cannot be loaded because you do not"
          + " have a subscription yet.",
      );
    }
  } catch {
    notifyError(
      "Unable to open the billing portal. Please try"
        + " again later.",
    );
  }
}
