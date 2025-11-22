import { Button, Loader } from "@mantine/core";
import { ReactNode, useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { assertIsDefined } from "@/lib/utils/asserts";
import { goToBillingPortal } from "./goToBillingPortal";

type Props = {
  children: ReactNode;
};

export function BillingPortalButton({ children }: Props): JSX.Element {
  const [isLoadingCustomerPortalURL, setIsLoadingCustomerPortalURL] =
    useState(false);
  const user = useCurrentUser();
  const userId = user?.id;

  return (
    <Button
      disabled={isLoadingCustomerPortalURL || !userId}
      variant="subtle"
      size="compact-md"
      px="xxs"
      onClick={async () => {
        assertIsDefined(
          userId,
          "User ID is required to get the customer portal URL",
        );
        setIsLoadingCustomerPortalURL(true);
        goToBillingPortal({ userId });
      }}
    >
      {children}
      {isLoadingCustomerPortalURL ?
        <Loader size="xs" ml="xs" />
      : null}
    </Button>
  );
}
