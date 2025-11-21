import { APIClient } from "@/clients/APIClient";
import { notifyError } from "@/lib/ui/notifications/notify";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { UserId } from "@/models/User/User.types";

export async function goToBillingPortal({
  userId,
}: {
  userId: UserId;
}): Promise<void> {
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
    navigateToExternalURL(customerPortalResponse.customerPortalURL);
  } else {
    notifyError(
      "Billing portal cannot be loaded because you do not have a subscription yet.",
    );
  }
}
