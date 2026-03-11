import { notifyError } from "@ui/notifications/notify";
import { UserId } from "$/models/User/User.types";
import { APIClient } from "@/clients/APIClient";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";

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
