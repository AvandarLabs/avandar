import { useMutation } from "@hooks";
import { Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifySuccess } from "@ui";
import { buildWorkspaceInviteRolePayload } from "$/models/Permissions/inviteRolePayload";
import { Subscription } from "$/models/Subscription/Subscription";
import { Workspace } from "$/models/Workspace/Workspace";
import { useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { WorkspaceInviteClient } from "@/clients/WorkspaceInviteClient";
import { WorkspaceBillingView } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { PurchaseSeatsModalContents } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm/PurchaseSeatsModalContents";
import { WorkspaceInviteModalFields } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm/WorkspaceInviteModalFields";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { RoleGroupWithMatrix } from "@/clients/permissions/PermissionsClient";
import type { WorkspaceInviteModalFieldsRef } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm/WorkspaceInviteModalFields";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";

export function useWorkspaceInviteModal({
  numberOfSeats,
  roleGroups,
}: {
  numberOfSeats: number | undefined;
  roleGroups: readonly RoleGroupWithMatrix[];
}): () => void {
  const featurePlanType = useFeaturePlanType();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const fieldsRef = useRef<WorkspaceInviteModalFieldsRef>(null);

  const [userGroups = [], userGroupsLoading] =
    PermissionsClient.useGetUserGroups({
      workspaceId: workspace.id,
    });

  const [sendInvite] = useMutation({
    mutationFn: (variables: {
      workspaceId: Workspace.Id;
      email: string;
      rolesMatrix: UserAppRolesMatrix;
      userGroupIds: readonly string[];
    }) => {
      const payload = buildWorkspaceInviteRolePayload(
        variables.rolesMatrix,
        roleGroups,
      );
      return APIClient.post({
        route: "workspaces/:workspaceId/invite",
        pathParams: {
          workspaceId: variables.workspaceId,
        },
        body: {
          emailToInvite: variables.email,
          role: payload.legacyRole,
          roleGroupId: payload.roleGroupId,
          roleOverrides: payload.roleOverrides,
          userGroupIds: [...variables.userGroupIds],
        },
      });
    },
    queriesToInvalidate: [
      WorkspaceInviteClient.QueryKeys.getPendingInvites({
        workspaceId: workspace.id,
      }),
    ],
  });

  const openInviteModal = (): void => {
    let modalId = "";
    const submit = async (): Promise<void> => {
      if (!fieldsRef.current?.validate()) {
        return;
      }
      const {
        email,
        rolesMatrix: matrix,
        tagIds,
      } = fieldsRef.current.getState();
      if (!email) {
        return;
      }
      modals.updateModal({
        modalId,
        confirmProps: { loading: true },
      });
      try {
        await sendInvite.async({
          workspaceId: workspace.id,
          email,
          rolesMatrix: matrix,
          userGroupIds: tagIds,
        });
        notifySuccess({ title: "Invite sent" });
        modals.close(modalId);
      } catch {
        modals.updateModal({
          modalId,
          confirmProps: { loading: false },
        });
      }
    };

    modalId = modals.openConfirmModal({
      title: "Invite a member",
      labels: {
        confirm: "Send invite",
        cancel: "Cancel",
      },
      closeOnConfirm: false,
      onConfirm: () => {
        void submit();
      },
      children: (
        <WorkspaceInviteModalFields
          ref={fieldsRef}
          featurePlanType={featurePlanType}
          userGroups={userGroups}
          userGroupsLoading={userGroupsLoading}
          onPressEnter={() => {
            void submit();
          }}
        />
      ),
    });
  };

  return (): void => {
    if (numberOfSeats === undefined || workspace.subscription === undefined) {
      return;
    }

    if (
      !Subscription.canInviteMembers({
        subscription: workspace.subscription,
        numMembersInWorkspace: numberOfSeats,
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
