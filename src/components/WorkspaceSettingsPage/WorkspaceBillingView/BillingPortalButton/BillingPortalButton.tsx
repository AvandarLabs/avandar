import { Button, Loader } from "@mantine/core";
import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined";
import { ReactNode, useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { goToBillingPortal } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/goToBillingPortal";

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
        try {
          await goToBillingPortal({ userId });
        } finally {
          setIsLoadingCustomerPortalURL(false);
        }
      }}
    >
      {children}
      {isLoadingCustomerPortalURL ?
        <Loader size="xs" ml="xs" />
      : null}
    </Button>
  );
}
