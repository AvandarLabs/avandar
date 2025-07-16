import {
  IconBlocks,
  IconDatabase,
  IconHome,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";
import { ReactNode } from "react";
import { AppLink, AppLinkKey, AppLinks } from "./AppLinks";

export type NavbarLink = {
  link: AppLink;
  icon: ReactNode;
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
  entityDesignerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.entityDesignerHome(workspaceSlug),
      icon: <IconBlocks size={24} stroke={1.5} />,
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
    };
  },
  workspaceSettings: (workspaceSlug: string) => {
    return {
      link: AppLinks.workspaceSettings(workspaceSlug),
      icon: <IconSettings size={24} stroke={1.5} />,
    };
  },
} as const satisfies NavbarLinksRecord;
