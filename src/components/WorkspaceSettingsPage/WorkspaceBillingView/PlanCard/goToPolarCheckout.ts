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
  checkoutEmail,
  currentPolarSubscriptionId,
  currentCustomerId,
}: {
  polarProductId: string;
  userId: UserId;
  workspaceId: WorkspaceId;

  /**
   * The email that will be stored in Polar as the customer's email. If a user
   * already has a subscription, this should be the same as the user's email.
   */
  checkoutEmail: string;

  /**
   * This is required for paid plans. For the free plan, this should not get
   * set.
   */
  numSeats?: number;

  /**
   * The ID of the current Polar subscription if we are upgrading from a free
   * plan to a paid plan.
   */
  currentPolarSubscriptionId: string | undefined;

  /**
   * The ID of the current customer in Polar (if they already exist)
   * to make sure we link the checkout to the same customer in Polar.
   */
  currentCustomerId: string | undefined;
}): Promise<void> {
  const currentURL = getCurrentURL();
  const { checkoutURL } = await APIClient.get({
    route: "subscriptions/checkout-url/:productId",
    pathParams: {
      productId: polarProductId,
    },
    queryParams: {
      successURL: currentURL,
      returnURL: currentURL,
      checkoutEmail,
      numSeats,
      userId,
      workspaceId,
      currentPolarSubscriptionId: currentPolarSubscriptionId ?? undefined,
      currentCustomerId: currentCustomerId ?? undefined,
    },
  });
  navigateToExternalURL(checkoutURL);
}
