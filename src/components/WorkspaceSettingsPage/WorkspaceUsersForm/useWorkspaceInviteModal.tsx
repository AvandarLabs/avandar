import { Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useRef } from "react";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { AvaForm } from "@/lib/ui/AvaForm";
import { AvaField } from "@/lib/ui/AvaForm/AvaField";
import { AvaFormRef } from "@/lib/ui/AvaForm/AvaForm.types";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { WorkspaceRole } from "@/models/Workspace/Workspace.types";

export function useWorkspaceInviteModal(): () => void {
  const featurePlanType = useFeaturePlanType();
  const formRef =
    useRef<AvaFormRef<{ email: string; role: WorkspaceRole }>>(null);

  const onSendInvite = () => {
    if (formRef.current) {
      notifyDevAlert(formRef.current.getFormValues());
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
        onSendInvite();
        modals.close(modalId);
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
            onSubmit={() => {
              onSendInvite();
            }}
          />
        </Stack>
      ),
    });
  };
}
