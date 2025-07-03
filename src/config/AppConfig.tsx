import { AppLinkKey } from "./AppLinks";

/** Configuration for the app. */
type TAppConfig = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  logoFilename: string;

  /** The name of the app. */
  appName: string;

  /** The order to show the navigable links in the Navbar */
  navbarLinkOrder: readonly AppLinkKey[];

  /** Configuration for the data import app */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: number;

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: number;
  };
};

export const AppConfig = {
  logoFilename: "logoWhite.png",
  appName: "Avandar",
  navbarLinkOrder: [
    "home",
    "dataManager",
    "dataExplorer",
    "entityDesigner",
  ] as const,

  dataManagerApp: {
    maxDatasetNameLength: 100,
    maxDatasetDescriptionLength: 500,
  },
} satisfies TAppConfig;
