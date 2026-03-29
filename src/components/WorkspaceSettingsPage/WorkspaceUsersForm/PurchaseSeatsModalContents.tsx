import { useMutation } from "@hooks/useMutation/useMutation";
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifySuccess } from "@ui/notifications/notify";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { goToBillingPortal } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/goToBillingPortal";
import type { Subscription } from "$/models/Subscription/Subscription.types";
import type { UserId } from "$/models/User/User.types";

type PurchaseSeatsModalContentsProps = {
  subscription: Subscription;
  currentSeatUsage: number;
  userId: UserId;
  onSeatsAdded: () => void;
};

export function PurchaseSeatsModalContents({
  subscription,
  currentSeatUsage,
  userId,
  onSeatsAdded,
}: PurchaseSeatsModalContentsProps): JSX.Element {
  const [seatsToAdd, setSeatsToAdd] = useState(1);

  const [purchaseSeats, isPurchasing] = useMutation({
    mutationFn: (variables: { seatsToAdd: number }) => {
      return APIClient.patch({
        route: "subscriptions/:subscriptionId/seats",
        pathParams: {
          subscriptionId: subscription.polarSubscriptionId,
        },
        body: {
          seatsToAdd: variables.seatsToAdd,
        },
      });
    },
    onSuccess: () => {
      notifySuccess({ title: "Seats purchased successfully" });
      modals.closeAll();
      onSeatsAdded();
    },
    queryToInvalidate: WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
  });

  const seatLabel = seatsToAdd === 1 ? "seat" : "seats";
  const totalSeats = subscription.maxSeatsAllowed;

  return (
    <Stack>
      <Text size="sm">
        Your workspace has used all {currentSeatUsage} of its {totalSeats}{" "}
        {totalSeats === 1 ? "seat" : "seats"}.
      </Text>

      <NumberInput
        label="Number of seats to add"
        min={1}
        value={seatsToAdd}
        onChange={(value) => {
          setSeatsToAdd(Number(value) || 1);
        }}
      />

      <Group justify="flex-end">
        <Button
          variant="default"
          onClick={() => {
            modals.closeAll();
          }}
        >
          Cancel
        </Button>
        <Button
          loading={isPurchasing}
          onClick={() => {
            purchaseSeats({ seatsToAdd });
          }}
        >
          Purchase {seatsToAdd} {seatLabel}
        </Button>
      </Group>

      <Divider label="or" labelPosition="center" />

      <Text
        size="sm"
        c="blue"
        style={{ cursor: "pointer" }}
        onClick={() => {
          modals.closeAll();
          goToBillingPortal({ userId });
        }}
      >
        Manage seats in billing portal →
      </Text>
    </Stack>
  );
}
