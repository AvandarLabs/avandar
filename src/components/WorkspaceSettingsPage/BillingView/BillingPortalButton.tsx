import { Button, ButtonProps } from "@mantine/core";
import { useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { notifyError } from "@/lib/ui/notifications/notify";
import { assertIsDefined } from "@/lib/utils/asserts";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";

export function BillingPortalButton(props: ButtonProps): JSX.Element {
  const [isLoadingCustomerPortalURL, setIsLoadingCustomerPortalURL] =
    useState(false);
  const user = useCurrentUser();
  const userId = user?.id;

  return (
    <Button
      disabled={isLoadingCustomerPortalURL || !userId}
      loading={isLoadingCustomerPortalURL}
      onClick={async () => {
        assertIsDefined(
          userId,
          "User ID is required to get the customer portal URL",
        );
        setIsLoadingCustomerPortalURL(true);
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
      }}
      {...props}
    >
      Go to billing portal
    </Button>
  );
}
