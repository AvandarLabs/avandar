import {
  IconDatabase,
  IconHome,
  IconTable,
  IconUpload,
  IconUser,
} from "@tabler/icons-react";

/**
 * Configuration for a navigable link in the app.
 * These show up in the navbar.
 */
type LinkConfig = {
  to: string;
  label: string;
  icon: React.ReactNode;

  /** Description to include in Spotlight (Cmd+K) */
  spotlightDescription: string;
};

/**
 * Configuration for the app.
 */
type AppConfig = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  logoFilename: string;

  /**
   * The name of the app.
   */
  appName: string;

  /**
   * Navigable links the app supports
   */
  links: Record<string, LinkConfig>;

  /**
   * The order to show the navigable links in the Navbar
   */
  navbarLinkOrder: readonly string[];

  dataImportApp: {
    maxDatasetNameLength: number;
    maxDatasetDescriptionLength: number;
  };
};

export const AppConfig = {
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
    dataExplorer: {
      to: "/data-explorer",
      label: "Data Explorer",
      icon: <IconTable size={24} stroke={1.5} />,
      spotlightDescription: "Go to the data explorer app",
    },
  },
  navbarLinkOrder: ["home", "dataManager", "dataExplorer", "profile"] as const,

  dataImportApp: {
    maxDatasetNameLength: 100,
    maxDatasetDescriptionLength: 500,
  },
} satisfies AppConfig;
