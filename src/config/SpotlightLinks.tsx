import { IconPencilPlus, IconUpload, IconUser } from "@tabler/icons-react";
import { ReactNode } from "react";
import { AppLink, AppLinkKey, AppLinks } from "./AppLinks";
import { NavbarLinks } from "./NavbarLinks";

/**
 * This is a link that shows up in the Spotlight (Cmd+K) and is used
 * for navigation, similar to a NavbarLink.
 */
export type SpotlightLink = {
  link: AppLink;

  /** Description to include in Spotlight (Cmd+K) */
  spotlightDescription: string;
  icon: ReactNode;
};

type SpotlightLinkRecord = Partial<
  Record<
    AppLinkKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpotlightLink | ((params: any) => SpotlightLink)
  >
>;

export const SpotlightLinks = {
  home: {
    link: AppLinks.home,
    spotlightDescription: "Go to home page",
    icon: NavbarLinks.home.icon,
  },
  profile: (workspaceSlug: string) => {
    return {
      link: AppLinks.profile(workspaceSlug),
      spotlightDescription: "Go to profile page",
      icon: <IconUser size={24} stroke={1.5} />,
    };
  },
  dataManagerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataManagerHome(workspaceSlug),
      icon: NavbarLinks.dataManagerHome(workspaceSlug).icon,
      spotlightDescription: "Go to the data import app",
    };
  },
  dataImport: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataImport(workspaceSlug),
      icon: <IconUpload size={24} stroke={1.5} />,
      spotlightDescription: "Go to the data import app",
    };
  },
  dataExplorer: (workspaceSlug: string) => {
    return {
      link: AppLinks.dataExplorer(workspaceSlug),
      icon: NavbarLinks.dataExplorer(workspaceSlug).icon,
      spotlightDescription: "Go to the data explorer app",
    };
  },
  entityDesignerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.entityDesignerHome(workspaceSlug),
      icon: NavbarLinks.entityDesignerHome(workspaceSlug).icon,
      spotlightDescription: "Go to the entity designer app",
    };
  },
  entityDesignerCreatorView: (workspaceSlug: string) => {
    return {
      link: AppLinks.entityDesignerCreatorView(workspaceSlug),
      icon: <IconPencilPlus size={24} stroke={1.5} />,
      spotlightDescription: "Go to the entity creator page",
    };
  },
} as const satisfies SpotlightLinkRecord;
