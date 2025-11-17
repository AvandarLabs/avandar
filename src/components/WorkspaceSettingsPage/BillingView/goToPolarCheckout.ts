import { APIClient } from "@/clients/APIClient";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { UserId } from "@/models/User/User.types";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";

export async function goToPolarCheckout({
  polarProductId,
  userId,
  workspaceId,
  numSeats,
  userEmail,
}: {
  polarProductId: string;
  userId: UserId;
  workspaceId: WorkspaceId;
  userEmail: string;

  /**
   * This is required for paid plans. For the free plan, this should not get
   * set.
   */
  numSeats?: number;
}): Promise<void> {
  const currentURL = getCurrentURL();
  const { checkoutURL } = await APIClient.get({
    route: "billing/checkout-url/:productId",
    pathParams: {
      productId: polarProductId,
    },
    queryParams: {
      successURL: currentURL,
      returnURL: currentURL,
      userEmail,
      numSeats,
      userId,
      workspaceId,
    },
  });
  navigateToExternalURL(checkoutURL);
}
