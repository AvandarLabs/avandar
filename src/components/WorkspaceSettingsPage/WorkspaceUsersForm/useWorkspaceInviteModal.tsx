import { useMutation } from "@hooks/useMutation/useMutation";
import { Stack, Text } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifySuccess } from "@ui/notifications/notify";
import { Workspace } from "$/models/Workspace/Workspace";
import { useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AvaField } from "@/lib/ui/AvaForm/AvaField";
import { AvaForm } from "@/lib/ui/AvaForm/AvaForm";
import { AvaFormRef } from "@/lib/ui/AvaForm/AvaForm.types";
import { WorkspaceBillingView } from "../WorkspaceBillingView/WorkspaceBillingView";
import { PurchaseSeatsModalContents } from "./PurchaseSeatsModalContents";

export function useWorkspaceInviteModal({
  numberOfSeats,
}: {
  numberOfSeats: number | undefined;
}): () => void {
  const featurePlanType = useFeaturePlanType();
  const workspace = useCurrentWorkspace();

  const user = useCurrentUser();
  const formRef =
    useRef<AvaFormRef<{ email: string; role: Workspace.Role }>>(null);
  const [inviteEmail] = useMutation({
    mutationFn: (variables: {
      workspaceId: Workspace.Id;
      email: string;
      role: Workspace.Role;
    }) => {
      return APIClient.post({
        route: "workspaces/:workspaceId/invite",
        pathParams: {
          workspaceId: variables.workspaceId,
        },
        body: {
          emailToInvite: variables.email,
          role: variables.role,
        },
      });
    },
    queriesToInvalidate: [
      WorkspaceClient.QueryKeys.getPendingInvites({
        workspaceId: workspace.id,
      }),
    ],
  });

  const onSendInviteClick = async (modalId: string) => {
    if (formRef.current) {
      const validation = formRef.current.getForm().validate();
      if (!validation.hasErrors) {
        const { email, role } = formRef.current.getFormValues();
        modals.updateModal({
          modalId,
          confirmProps: { loading: true },
        });
        await inviteEmail.async({
          workspaceId: workspace.id,
          email,
          role,
        });
        notifySuccess({ title: "Invite sent" });
        modals.close(modalId);
      }
    }
  };

  const openInviteModal = (): void => {
    const modalId = modals.openConfirmModal({
      title: "Add a member to your Workspace",
      labels: {
        confirm: "Send invite",
        cancel: "Cancel",
      },
      confirmProps: {
        disabled: true,
      },
      closeOnConfirm: false,
      onConfirm: () => {
        onSendInviteClick(modalId);
      },
      children: (
        <Stack>
          <Text size="sm" c="dimmed">
            Type or paste in an email below.
            {featurePlanType !== "free" ?
              "Your workspace will be billed per member."
            : null}
          </Text>
          <AvaForm
            ref={formRef}
            hideSubmitButton
            fields={{
              email: AvaField.email({
                key: "email",
                initialValue: "",
                label: "Email address",
                onChange: (newEmail) => {
                  modals.updateModal({
                    modalId,
                    confirmProps: { disabled: !newEmail },
                  });
                },
              }),
              role: AvaField.select({
                key: "role",
                data: [
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Admin" },
                ] as const,
                initialValue: "member",
              }),
            }}
            formElements={["email", "role"]}
            onKeyDown={getHotkeyHandler([
              [
                "Enter",
                (event) => {
                  event.preventDefault();
                  onSendInviteClick(modalId);
                },
              ],
            ])}
          />
        </Stack>
      ),
    });
  };

  return (): void => {
    // do nothing if we don't know how many seats are in the workspace
    // ideally, this function should have never gotten called yet.
    if (numberOfSeats === undefined) {
      return;
    }

    if (
      !Workspace.Features.canInviteMoreUsers({
        workspace,
        numSeatsInWorkspace: numberOfSeats,
      })
    ) {
      if (featurePlanType === "free") {
        return void modals.open({
          title: "Seat limit reached",
          size: "100%",
          styles: {
            content: { height: "100%" },
          },
          children: (
            <Stack>
              <Text>
                Your workspace is on the Free plan, which supports up to 2
                seats. To invite more team members, upgrade to a paid plan for
                unlimited seats.
              </Text>

              <WorkspaceBillingView hideTitle hideIntroText />
            </Stack>
          ),
        });
      }

      return void modals.open({
        title: "Additional seats required",
        children: (
          <PurchaseSeatsModalContents
            subscription={workspace.subscription!}
            currentSeatUsage={numberOfSeats}
            userId={user!.id}
            onSeatsAdded={() => {
              setTimeout(() => {
                openInviteModal();
              }, 300);
            }}
          />
        ),
      });
    }

    openInviteModal();
  };
}
