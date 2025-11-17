import { APIClient } from "@/clients/APIClient";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";

export async function goToPolarCheckout({
  polarProductId,
  numSeats,
  userEmail,
}: {
  polarProductId: string;
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
    },
  });
  navigateToExternalURL(checkoutURL);
}
