import { IconPencilPlus, IconUpload, IconUser } from "@tabler/icons-react";
import { ReactNode } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";
import type { AppLink, AppLinkKey } from "@/config/AppLinks/AppLinks";

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
      link: AppLinks.dataImport(workspaceSlug),
      icon: NavbarLinks.dataImport(workspaceSlug).icon,
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
  ontologyDesignerHome: (workspaceSlug: string) => {
    return {
      link: AppLinks.ontologyDesignerHome(workspaceSlug),
      icon: NavbarLinks.ontologyDesignerHome(workspaceSlug).icon,
      spotlightDescription: "Go to the ontology designer app",
    };
  },
  ontologyDesignerCreatorView: (workspaceSlug: string) => {
    return {
      link: AppLinks.ontologyDesignerCreatorView(workspaceSlug),
      icon: <IconPencilPlus size={24} stroke={1.5} />,
      spotlightDescription: "Go to the individual creator page",
    };
  },
} as const satisfies SpotlightLinkRecord;
