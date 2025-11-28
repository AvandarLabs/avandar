import { Select, Stack, Text, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useState } from "react";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { AvaForm } from "@/lib/ui/AvaForm";
import { notifyNotImplemented } from "@/lib/ui/notifications/notifyNotImplemented";
import { WorkspaceRole } from "@/models/Workspace/Workspace.types";

export function useWorkspaceInviteModal(): () => void {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const featurePlanType = useFeaturePlanType();

  const onSendInvite = () => {
    setInviteEmail("");
    setInviteRole("member");
    notifyNotImplemented();
  };

  return (): void => {
    const modalId = modals.openConfirmModal({
      title: "Add a member to your Workspace",
      labels: {
        confirm: "Send invite",
        cancel: "Cancel",
      },
      confirmProps: {
        disabled: !inviteEmail || !inviteRole,
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
            fields={{
              email: {
                key: "email",
                type: "text",
                semanticType: "email",
                initialValue: "",
                label: "Email address",
              },
              role: {
                key: "role",
                type: "select",
                initialValue: "",
                label: "Role",
                data: [],
              },
            }}
            formElements={["email", "role"]}
          />

          <TextInput
            label="Email address"
            placeholder="Enter email"
            value={inviteEmail}
            onChange={(e) => {
              return setInviteEmail(e.currentTarget.value);
            }}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(val) => {
              return setInviteRole(val as WorkspaceRole);
            }}
            data={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </Stack>
      ),
    });
  };
}
