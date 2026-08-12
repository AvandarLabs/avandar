import { useMutation } from "@avandar/query-hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { buildWorkspaceInviteRolePayload } from "$/models/Permissions/inviteRolePayload";
import { Subscription } from "$/models/Subscription/Subscription";
import { Workspace } from "$/models/Workspace/Workspace";
import { useRef } from "react";
import { APIClient } from "@/clients/APIClient";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { WorkspaceInviteClient } from "@/clients/WorkspaceInviteClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useFeaturePlanType } from "@/hooks/workspaces/useCurrentSubscriptionType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifySuccess } from "@/utils/notifications/notify";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { PurchaseSeatsModalContents } from "@/views/WorkspaceSettingsPage/WorkspaceUsersForm/PurchaseSeatsModalContents";
import { WorkspaceInviteModalFields } from "@/views/WorkspaceSettingsPage/WorkspaceUsersForm/WorkspaceInviteModalFields";
import type { RoleGroupWithMatrix } from "@/clients/permissions/PermissionsClient";
import type { WorkspaceInviteModalFieldsRef } from "@/views/WorkspaceSettingsPage/WorkspaceUsersForm/WorkspaceInviteModalFields";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";

export function useWorkspaceInviteModal({
  numberOfSeats,
  roleGroups,
}: {
  numberOfSeats: number | undefined;
  roleGroups: readonly RoleGroupWithMatrix[];
}): () => void {
  const { t } = useLingui();
  const featurePlanType = useFeaturePlanType();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const fieldsRef = useRef<WorkspaceInviteModalFieldsRef>(null);

  const [userGroups = [], userGroupsLoading] =
    PermissionsClient.useGetUserGroups({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
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
        notifySuccess({ title: t`Invite sent` });
        modals.close(modalId);
      } catch {
        modals.updateModal({
          modalId,
          confirmProps: { loading: false },
        });
      }
    };

    modalId = modals.openConfirmModal({
      title: t`Invite a member`,
      transitionProps: {
        onEntered: () => {
          fieldsRef.current?.notifyModalOpened();
        },
      },
      labels: {
        confirm: t`Send invite`,
        cancel: t`Cancel`,
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
          title: t`Seat limit reached`,
          size: "100%",
          styles: {
            content: { height: "100%" },
          },
          children: (
            <Stack>
              <Text>
                <Trans>
                  Your workspace is on the Free plan, which supports up to 2
                  seats. To invite more team members, upgrade to a paid plan for
                  unlimited seats.
                </Trans>
              </Text>

              <WorkspaceBillingView hideTitle hideIntroText />
            </Stack>
          ),
        });
      }

      return void modals.open({
        title: t`Additional seats required`,
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
