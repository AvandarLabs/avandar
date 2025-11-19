import { Button, ButtonProps, Loader } from "@mantine/core";
import { useCustomerPortalURL } from "./PlanCard/useCustomerPortalURL";

export function BillingPortalButton(props: ButtonProps): JSX.Element {
  const [customerPortalURL, isLoadingCustomerPortalURL] =
    useCustomerPortalURL();

  if (isLoadingCustomerPortalURL) {
    return <Loader />;
  }

  return (
    <Button component="a" href={customerPortalURL} target="_blank" {...props}>
      Go to billing portal
    </Button>
  );
}
