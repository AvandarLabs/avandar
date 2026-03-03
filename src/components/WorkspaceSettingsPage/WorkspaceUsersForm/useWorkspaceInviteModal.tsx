import { Stack, Text } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { AvaForm } from "@/lib/ui/AvaForm";
import { AvaField } from "@/lib/ui/AvaForm/AvaField";
import { AvaFormRef } from "@/lib/ui/AvaForm/AvaForm.types";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { WorkspaceRole } from "@/models/Workspace/Workspace.types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { Workspaces } from "@/models/Workspace/Workspaces";
import { WorkspaceBillingView } from "../WorkspaceBillingView";

export function useWorkspaceInviteModal({
  numberOfSeats,
}: {
  numberOfSeats: number | undefined;
}): () => void {
  const featurePlanType = useFeaturePlanType();
  const workspace = useCurrentWorkspace();
  const formRef =
    useRef<AvaFormRef<{ email: string; role: WorkspaceRole }>>(null);
  const [inviteEmail] = useMutation({
    mutationFn: (variables: {
      workspaceSlug: string;
      email: string;
      role: WorkspaceRole;
    }) => {
      return APIClient.post({
        route: "workspaces/:workspaceSlug/invite",
        pathParams: {
          workspaceSlug: variables.workspaceSlug,
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
          workspaceSlug: workspace.slug,
          email,
          role,
        });
        notifySuccess({ title: "Invite sent" });
        modals.close(modalId);
      }
    }
  };

  return (): void => {
    // do nothing if we don't know how many seats are in the workspace
    // ideally, this function should have never gotten called yet.
    if (numberOfSeats === undefined) {
      return;
    }

    if (
      !Workspaces.Features.canInviteMoreUsers({
        workspace,
        numSeatsInWorkspace: numberOfSeats,
      })
    ) {
      return void modals.open({
        title: "Seat limit reached",
        size: "100%",
        styles: {
          content: { height: "100%" },
        },
        children: (
          <Stack>
            <Text>
              Your workspace is on the Free plan, which supports up to 2 seats.
              To invite more team members, upgrade to a paid plan for unlimited
              seats.
            </Text>

            <WorkspaceBillingView hideTitle hideIntroText />
          </Stack>
        ),
      });
    }

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
}
