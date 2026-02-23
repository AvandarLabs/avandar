import {
  IconBlocks,
  IconDatabase,
  IconHome,
  IconLayoutDashboard,
  IconMap,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";
import { ReactNode } from "react";
import { User } from "@/models/User/User.types";
import { WorkspaceWithSubscription } from "@/models/Workspace/Workspace.types";
import { AppLink, AppLinkKey, AppLinks } from "./AppLinks";
import { FeatureFlag, isFlagEnabled } from "./FeatureFlagConfig";

export type NavbarLink = {
  link: AppLink;
  icon: ReactNode;

  /**
   * Whether or not this link should be shown
   */
  isEnabled?: (options: {
    user: User;
    workspace: WorkspaceWithSubscription;
  }) => boolean;
};

type NavbarLinksRecord = Partial<
  Record<
    AppLinkKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavbarLink | ((params: any) => NavbarLink)
  >
>;

export const NavbarLinks = {
  home: {
    link: AppLinks.home,
    icon: <IconHome size={24} stroke={1.5} />,
  },
  workspaceHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.workspaceHome(workspaceSlug),
      icon: <IconHome size={24} stroke={1.5} />,
    };
  },
  dataManagerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataManagerHome(workspaceSlug),
      icon: <IconDatabase size={24} stroke={1.5} />,
    };
  },
  dataExplorer: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataExplorer(workspaceSlug),
      icon: <IconTable size={24} stroke={1.5} />,
    };
  },
  dashboards: (workspaceSlug: string) => {
    return {
      link: AppLinks.dashboards(workspaceSlug),
      icon: <IconLayoutDashboard size={24} stroke={1.5} />,
    };
  },
  map: (workspaceSlug: string) => {
    return {
      link: AppLinks.map(workspaceSlug),
      icon: <IconMap size={24} stroke={1.5} />,
      isEnabled: () => {
        return !isFlagEnabled(FeatureFlag.DisableGeoExplorer);
      },
    };
  },
  entityDesignerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.entityDesignerHome(workspaceSlug),
      icon: <IconBlocks size={24} stroke={1.5} />,
      isEnabled: () => {
        return !isFlagEnabled(FeatureFlag.DisableProfileManager);
      },
    };
  },
  entityManagerHome: ({
    workspaceSlug,
    entityConfigId,
    entityConfigName,
  }: {
    workspaceSlug: string;
    entityConfigId: string;
    entityConfigName: string;
  }) => {
    return {
      link: AppLinks.entityManagerHome({
        workspaceSlug,
        entityConfigId,
        entityConfigName,
      }),
      icon: <IconBlocks size={24} stroke={1.5} />,
      isEnabled: () => {
        return !isFlagEnabled(FeatureFlag.DisableProfileManager);
      },
    };
  },
  workspaceSettings: (workspaceSlug: string) => {
    return {
      link: AppLinks.workspaceSettings(workspaceSlug),
      icon: <IconSettings size={24} stroke={1.5} />,
    };
  },
} as const satisfies NavbarLinksRecord;
