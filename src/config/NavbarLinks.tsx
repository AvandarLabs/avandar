import {
  IconBlocks,
  IconDatabase,
  IconHome,
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
  dataManager: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataManager(workspaceSlug),
      icon: <IconDatabase size={24} stroke={1.5} />,
    };
  },
  dataExplorer: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataExplorer(workspaceSlug),
      icon: <IconTable size={24} stroke={1.5} />,
    };
  },
  entityDesigner: (workspaceSlug: string) => {
    return {
      link: AppLinks.entityDesigner(workspaceSlug),
      icon: <IconBlocks size={24} stroke={1.5} />,
    };
  },
  entityManager: ({
    workspaceSlug,
    entityConfigId,
    entityConfigName,
  }: {
    workspaceSlug: string;
    entityConfigId: string;
    entityConfigName: string;
  }) => {
    return {
      link: AppLinks.entityManager({
        workspaceSlug,
        entityConfigId,
        entityConfigName,
      }),
      icon: <IconBlocks size={24} stroke={1.5} />,
    };
  },
} as const satisfies NavbarLinksRecord;
