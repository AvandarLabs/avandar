import { Button, ButtonProps } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { assertIsDefined } from "@/lib/utils/asserts";
import { goToBillingPortal } from "./goToBillingPortal";

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
        goToBillingPortal({ userId });
      }}
      {...props}
    >
      Go to billing portal
    </Button>
  );
}
