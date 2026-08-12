import { useMutation } from "@avandar/query-hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { notifySuccess } from "@/utils/notifications/notify";
import { goToBillingPortal } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/goToBillingPortal";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";
import type { UserId } from "$/models/User/User.types";

type Props = {
  subscription: SubscriptionRead;
  currentSeatUsage: number;
  userId: UserId;
  onSeatsAdded: () => void;
};

/**
 * Modal body that lets a workspace owner buy additional seats on a Polar
 * subscription, or open the Polar billing portal to manage seats there.
 */
export function PurchaseSeatsModalContents({
  subscription,
  currentSeatUsage,
  userId,
  onSeatsAdded,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [seatsToAdd, setSeatsToAdd] = useState(1);

  const [purchaseSeats, isPurchasing] = useMutation({
    mutationFn: (variables: { seatsToAdd: number }) => {
      if (subscription.polarSubscriptionId === undefined) {
        throw new Error("Seat purchases require a Polar-backed subscription.");
      }

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
      notifySuccess({ title: t`Seats purchased successfully` });
      modals.closeAll();
      onSeatsAdded();
    },
    queryToInvalidate: WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
  });

  const totalSeats = subscription.maxSeatsAllowed;

  return (
    <Stack>
      <Text size="sm">
        {totalSeats === 1 ?
          <Trans>
            Your workspace has used all {currentSeatUsage} of its {totalSeats}{" "}
            seat.
          </Trans>
        : <Trans>
            Your workspace has used all {currentSeatUsage} of its {totalSeats}{" "}
            seats.
          </Trans>
        }
      </Text>

      <NumberInput
        label={t`Number of seats to add`}
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
          <Trans>Cancel</Trans>
        </Button>
        <Button
          loading={isPurchasing}
          onClick={() => {
            purchaseSeats({ seatsToAdd });
          }}
        >
          {seatsToAdd === 1 ?
            <Trans>Purchase {seatsToAdd} seat</Trans>
          : <Trans>Purchase {seatsToAdd} seats</Trans>}
        </Button>
      </Group>

      <Divider label={t`or`} labelPosition="center" />

      <Text
        size="sm"
        c="blue"
        style={{ cursor: "pointer" }}
        onClick={() => {
          modals.closeAll();
          goToBillingPortal({ userId });
        }}
      >
        <Trans>Manage seats in billing portal →</Trans>
      </Text>
    </Stack>
  );
}
