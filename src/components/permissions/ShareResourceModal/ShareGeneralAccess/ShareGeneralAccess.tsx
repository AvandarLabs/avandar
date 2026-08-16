import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { appForResource } from "../copy/appForResource";
import { GeneralAccessModule } from "../GeneralAccessModule/GeneralAccessModule";
import { ShareWorkspaceRoleSelect } from "./ShareWorkspaceRoleSelect";
import type { GeneralAccessValue } from "../GeneralAccessModule/GeneralAccessModule";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { I18n } from "@lingui/core";
import type { ComboboxData } from "@mantine/core";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { ReactNode } from "react";

// Only one `ShareGeneralAccess` renders per modal, so a static id is safe:
// there is no risk of two instances colliding in the same document.
const _PUBLIC_OPTION_DISABLED_REASON_ID = "share-general-access-public-reason";

type Props = {
  resourceType: ResourceType;
  value: GeneralAccessValue;
  isOwner: boolean;
  isBusy: boolean;
  workspaceShareRole: RoleLevel | null;
  /** False for resource types with no published form; hides the option. */
  isPublicOptionAvailable: boolean;
  /** Set when the option is visible but not selectable. */
  publicOptionDisabledReason: string | undefined;
  onChange: (nextValue: GeneralAccessValue) => void;
  onWorkspaceRoleChange: (role: RoleLevel) => void;
};

/**
 * What the currently selected access shape actually means, spelled out for the
 * dropdown's tooltip.
 *
 * Takes `i18n` and resolves `msg` descriptors rather than taking the `t` from
 * `useLingui()`: a translate function threaded in as a parameter is a runtime
 * value the extractor cannot follow, so those sentences would never reach the
 * catalogs.
 */
function _getGeneralAccessTooltip(
  options: Readonly<{
    value: GeneralAccessValue;
    isOwner: boolean;
    app: string;
    resource: string;
    i18n: I18n;
  }>,
): string {
  const { value, isOwner, app, resource, i18n } = options;
  return matchLiteral(value, {
    private: () => {
      return isOwner ?
          i18n._(
            msg`Only you can access this ${resource}. Everyone else loses access, including workspace admins.`,
          )
        : i18n._(msg`Only the owner can make this ${resource} private.`);
    },
    restricted: () => {
      return i18n._(
        msg`Only the people and groups listed below can access this ${resource}.`,
      );
    },
    workspace: () => {
      return i18n._(
        msg`Every workspace member who can open the ${app} app gets this role on this ${resource}, in addition to whatever's listed below.`,
      );
    },
    public: () => {
      return i18n._(
        msg`Anyone with the link can view this ${resource}, with no Avandar account. People and groups below still control who can edit it.`,
      );
    },
  });
}

/** The General access dropdown itself, wrapped in its explanatory tooltip. */
function _renderGeneralAccessSelect(
  options: Readonly<{
    value: GeneralAccessValue;
    isBusy: boolean;
    generalOptions: ComboboxData;
    tooltip: string;
    ariaLabel: string;
    describedById: string | undefined;
    onChange: (nextValue: GeneralAccessValue) => void;
  }>,
): ReactNode {
  const { value, isBusy, generalOptions, tooltip, ariaLabel, describedById } =
    options;
  return (
    <Tooltip label={tooltip} multiline w={320}>
      <Select
        flex={1}
        disabled={isBusy}
        leftSection={<IconBuilding size={16} aria-hidden />}
        data={generalOptions}
        value={value}
        allowDeselect={false}
        onChange={(nextValue) => {
          if (nextValue && GeneralAccessModule.isValidAccessValue(nextValue)) {
            options.onChange(nextValue);
          }
        }}
        aria-label={ariaLabel}
        aria-describedby={describedById}
      />
    </Tooltip>
  );
}

/**
 * "General access" section: a single dropdown over the three access shapes
 * (`Only me`, `Restricted`, and `Anyone in {AppLabel}`), plus a role picker
 * that only appears for the workspace-wide option.
 */
export function ShareGeneralAccess({
  resourceType,
  value,
  isOwner,
  isBusy,
  workspaceShareRole,
  isPublicOptionAvailable,
  publicOptionDisabledReason,
  onChange,
  onWorkspaceRoleChange,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const app = appLabel(appForResource(resourceType));
  const resource = resourceTypeLabel(resourceType);
  const showPublicOptionDisabledReason =
    isPublicOptionAvailable && publicOptionDisabledReason !== undefined;

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        <Trans>General access</Trans>
      </Text>
      <Group wrap="nowrap" align="flex-end" gap="sm">
        {_renderGeneralAccessSelect({
          value,
          isBusy,
          generalOptions: GeneralAccessModule.makeDropdownOptionsFromLabels({
            isOwner,
            labels: {
              private: t`Only me`,
              restricted: t`Restricted`,
              workspace: t`Anyone in ${app}`,
              public: t`Anyone with the link`,
            },
            isPublicOptionAvailable,
            isPublicOptionDisabled: publicOptionDisabledReason !== undefined,
          }),
          tooltip: _getGeneralAccessTooltip({
            value,
            isOwner,
            app,
            resource,
            i18n,
          }),
          ariaLabel: t`General access`,
          describedById:
            showPublicOptionDisabledReason ?
              _PUBLIC_OPTION_DISABLED_REASON_ID
            : undefined,
          onChange,
        })}
        {value === "workspace" ?
          <ShareWorkspaceRoleSelect
            role={workspaceShareRole}
            isDisabled={isBusy}
            onChange={onWorkspaceRoleChange}
          />
        : null}
      </Group>
      {showPublicOptionDisabledReason ?
        <Text id={_PUBLIC_OPTION_DISABLED_REASON_ID} size="xs" c="dimmed">
          {publicOptionDisabledReason}
        </Text>
      : null}
      <Text size="xs" c="dimmed">
        <Trans>
          Controls the default for the rest of the workspace. People without app
          access still need a direct share below.
        </Trans>
      </Text>
    </Stack>
  );
}
