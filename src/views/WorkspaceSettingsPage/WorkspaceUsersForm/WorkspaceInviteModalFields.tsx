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
import { WorkspaceAppRoleMatrixForm } from "@/views/WorkspaceSettingsPage/WorkspaceAppRoleMatrixForm/WorkspaceAppRoleMatrixForm";
import { AvaField } from "@/components/forms/AvaForm/AvaField";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AvaFormRef } from "@/components/forms/AvaForm/AvaForm.types";
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
        Type or paste an email below.
        {featurePlanType !== "free" ?
          " Your workspace will be billed per member."
        : null}
      </Text>
      <AvaForm
        ref={innerFormRef}
        hideSubmitButton
        fields={{
          email: AvaField.email({
            key: "email",
            initialValue: "",
            label: "Email address",
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
        label="Tags for invitee"
        placeholder="Optional"
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
