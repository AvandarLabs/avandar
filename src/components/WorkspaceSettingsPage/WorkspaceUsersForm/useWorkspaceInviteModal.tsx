import { Stack, Text } from "@mantine/core";
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

export function useWorkspaceInviteModal(): () => void {
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSendInviteClick(modalId);
              }
            }}
          />
        </Stack>
      ),
    });
  };
}
