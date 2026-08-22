import type { ReactNode } from "react";

import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

type Props = { workspaceSlug: string };

/** Creates a new map and navigates to its editor. */
export function CreateMapButton({ workspaceSlug }: Props): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const [insertMap, isPending] = AvaMapClient.useInsert({
    queryToInvalidate: AvaMapClient.QueryKeys.getAll(),
    onSuccess: (createdMap) => {
      const link = AppLinks.mapEditor({ workspaceSlug, mapId: createdMap.id });
      navigate({ to: link.to, params: link.params });
    },
  });

  return (
    <Button
      leftSection={<IconPlus size={16} />}
      loading={isPending}
      disabled={!userProfile}
      onClick={() => {
        if (!userProfile) {
          return;
        }
        insertMap({
          data: Model.make("AvaMap", {
            name: t`Untitled map`,
            description: undefined,
            slug: undefined,
            workspaceId: workspace.id,
            ownerId: userProfile.userId,
            ownerProfileId: userProfile.profileId,
            config: AvaMapConfig.makeEmpty(),
          }),
        });
      }}
      size="compact-sm"
    >
      {t`New map`}
    </Button>
  );
}
