import {
  IconBlocks,
  IconDatabase,
  IconHome,
  IconPencilPlus,
  IconTable,
  IconUpload,
  IconUser,
} from "@tabler/icons-react";
import { LinkProps } from "@tanstack/react-router";

/**
 * Configuration for a navigable link in the app.
 * These show up in the navbar.
 */
type LinkConfig = {
  to: LinkProps["to"];
  label: string;
  icon: React.ReactNode;

  /** Description to include in Spotlight (Cmd+K) */
  spotlightDescription: string;
};

/** Configuration for the app. */
type AppConfig = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  logoFilename: string;

  /** The name of the app. */
  appName: string;

  /** Navigable links the app supports */
  links: Record<string, LinkConfig>;

  /** The order to show the navigable links in the Navbar */
  navbarLinkOrder: readonly string[];

  /** Configuration for the data import app */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: number;

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: number;
  };
};

export const APP_CONFIG = {
  logoFilename: "logoWhite.png",
  appName: "Avandar",
  links: {
    home: {
      to: "/",
      label: "Home",
      icon: <IconHome size={24} stroke={1.5} />,
      spotlightDescription: "Go to home page",
    },
    profile: {
      to: "/profile",
      label: "Profile",
      icon: <IconUser size={24} stroke={1.5} />,
      spotlightDescription: "Go to profile page",
    },
    dataManager: {
      to: "/data-manager",
      label: "Data Manager",
      icon: <IconDatabase size={24} stroke={1.5} />,
      spotlightDescription: "Go to the data import app",
    },
    dataImport: {
      to: "/data-manager/data-import",
      label: "Import data",
      icon: <IconUpload size={24} stroke={1.5} />,
      spotlightDescription: "Go to the data import page",
    },
    dataExplorer: {
      to: "/data-explorer",
      label: "Data Explorer",
      icon: <IconTable size={24} stroke={1.5} />,
      spotlightDescription: "Go to the data explorer app",
    },
    entityDesigner: {
      to: "/entity-designer",
      label: "Entity Designer",
      icon: <IconBlocks size={24} stroke={1.5} />,
      spotlightDescription: "Go to the entity designer app",
    },
    entityCreator: {
      to: "/entity-designer/entity-creator",
      label: "Create new entity",
      icon: <IconPencilPlus size={24} stroke={1.5} />,
      spotlightDescription: "Go to the entity creator page",
    },
  },
  navbarLinkOrder: [
    "home",
    "dataManager",
    "dataExplorer",
    "entityDesigner",
    "profile",
  ] as const,

  dataManagerApp: {
    maxDatasetNameLength: 100,
    maxDatasetDescriptionLength: 500,
  },
} satisfies AppConfig;
