import { t } from "@lingui/core/macro";
import {
  IconBlocks,
  IconDatabase,
  IconHome,
  IconLayoutDashboard,
  IconMap,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AppLink, AppLinkKey } from "@/config/AppLinks/AppLinks";
import type { ReactNode } from "react";

export type NavbarLink = {
  link: AppLink;
  icon: ReactNode;

  /**
   * Whether or not this link should be shown
   */
  isEnabled?: (options: {
    user: User.T;
    workspace: Workspace.WithSubscription;
  }) => boolean;
};

type NavbarLinksRecord = Partial<
  Record<
    AppLinkKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavbarLink | ((params: any) => NavbarLink)
  >
>;

const DEFAULT_ICON_SIZE = 18;

export const NavbarLinks = {
  home: {
    link: AppLinks.home,
    icon: <IconHome size={DEFAULT_ICON_SIZE} stroke={1.5} />,
  },
  workspaceHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.workspaceHome(workspaceSlug),
      icon: <IconHome size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
  dataImport: (workspaceSlug: string) => {
    return {
      link: {
        ...AppLinks.dataImport(workspaceSlug),
        label: (): string => {
          return t`Data Sources`;
        },
      },
      icon: <IconDatabase size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
  dataExplorer: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataExplorer(workspaceSlug),
      icon: <IconTable size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
  dashboards: (workspaceSlug: string) => {
    return {
      link: AppLinks.dashboards(workspaceSlug),
      icon: <IconLayoutDashboard size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
  map: (workspaceSlug: string) => {
    return {
      link: AppLinks.map(workspaceSlug),
      icon: <IconMap size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
  ontologyDesignerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.ontologyDesignerHome(workspaceSlug),
      icon: <IconBlocks size={DEFAULT_ICON_SIZE} stroke={1.5} />,
      isEnabled: () => {
        return !isFlagEnabled(FeatureFlag.DisableProfileManager);
      },
    };
  },
  individualManagerHome: ({
    workspaceSlug,
    conceptId,
    conceptName,
  }: {
    workspaceSlug: string;
    conceptId: string;
    conceptName: string;
  }) => {
    return {
      link: AppLinks.individualManagerHome({
        workspaceSlug,
        conceptId,
        conceptName,
      }),
      icon: <IconBlocks size={DEFAULT_ICON_SIZE} stroke={1.5} />,
      isEnabled: () => {
        return !isFlagEnabled(FeatureFlag.DisableProfileManager);
      },
    };
  },
  workspaceSettings: (workspaceSlug: string) => {
    return {
      link: AppLinks.workspaceSettings(workspaceSlug),
      icon: <IconSettings size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
} as const satisfies NavbarLinksRecord;
