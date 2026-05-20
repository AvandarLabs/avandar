import { Trans, useLingui } from "@lingui/react/macro";
import { MultiSelect, Stack, Text } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { Permissions } from "$/models/Permissions/Permissions";
import {
  ForwardedRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AvaField } from "@/components/forms/AvaForm/AvaField";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AvaFormRef } from "@/components/forms/AvaForm/AvaForm.types";
import { WorkspaceAppRoleMatrixForm } from "@/views/WorkspaceSettingsPage/WorkspaceAppRoleMatrixForm/WorkspaceAppRoleMatrixForm";
import type {
  BuiltinPresetType,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";

export type WorkspaceInviteModalFieldsRef = {
  getState: () => {
    email: string;
    rolesMatrix: UserAppRolesMatrix;
    tagIds: string[];
  };
  validate: () => boolean;
};

type Props = {
  featurePlanType: string | undefined;
  userGroups: ReadonlyArray<{ id: string; name: string }>;
  userGroupsLoading: boolean;
  onPressEnter: () => void;
};

/**
 * Invite modal fields: email, role matrix, and optional tags.
 */
export const WorkspaceInviteModalFields = forwardRef<
  WorkspaceInviteModalFieldsRef,
  Props
>(function WorkspaceInviteModalFields(
  { featurePlanType, userGroups, userGroupsLoading, onPressEnter }: Props,
  ref: ForwardedRef<WorkspaceInviteModalFieldsRef>,
): JSX.Element {
  const { t } = useLingui();
  const innerFormRef = useRef<AvaFormRef<{ email: string }>>(null);
  const [rolesMatrix, setROlesMatrix] = useState<UserAppRolesMatrix>(
    Permissions.RolesMatrix.roleMatrixFromPresetType("global_viewer"),
  );
  const [builtinPresetType, setBuiltinPresetType] =
    useState<BuiltinPresetType>("global_viewer");
  const [tagIds, setTagIds] = useState<string[]>([]);

  useImperativeHandle(ref, (): WorkspaceInviteModalFieldsRef => {
    return {
      getState: () => {
        const email = innerFormRef.current?.getFormValues().email ?? "";
        return { email, rolesMatrix, tagIds };
      },
      validate: () => {
        if (!innerFormRef.current) {
          return false;
        }
        return !innerFormRef.current.getForm().validate().hasErrors;
      },
    };
  });

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {featurePlanType !== "free" ?
          <Trans>
            Type or paste an email below. Your workspace will be billed per
            member.
          </Trans>
        : <Trans>Type or paste an email below.</Trans>}
      </Text>
      <AvaForm
        ref={innerFormRef}
        hideSubmitButton
        fields={{
          email: AvaField.email({
            key: "email",
            initialValue: "",
            label: t`Email address`,
          }),
        }}
        formElements={["email"]}
        onKeyDown={getHotkeyHandler([
          [
            "Enter",
            (event) => {
              event.preventDefault();
              onPressEnter();
            },
          ],
        ])}
      />
      <WorkspaceAppRoleMatrixForm
        rolesMatrix={rolesMatrix}
        onRolesMatrixChange={(next) => {
          setROlesMatrix(next);
          setBuiltinPresetType(
            Permissions.RolesMatrix.roleGroupPresetTypeFromRoleMatrix(next),
          );
        }}
        builtinPresetTypes={builtinPresetType}
        onBuiltinPresetTypeChange={(next) => {
          setBuiltinPresetType(next);
        }}
      />
      <MultiSelect
        label={t`User groups for invitee`}
        placeholder={t`Optional`}
        data={userGroups.map((g) => {
          return { value: g.id, label: g.name };
        })}
        value={tagIds}
        onChange={setTagIds}
        disabled={userGroupsLoading}
      />
    </Stack>
  );
});
