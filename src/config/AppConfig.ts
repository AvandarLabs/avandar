/**
 * Configuration for a navigable link in the app.
 * These show up in the navbar.
 */
type LinkConfig = {
  to: string;
  label: string;
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
};

export const AppConfig = {
  logoFilename: "logoWhite.png",
  appName: "Avandar",
  links: {
    home: { to: "/", label: "Home" },
    profile: { to: "/profile", label: "Profile" },
    dataImport: { to: "/data-import", label: "Data Import" },
  } as const,
  navbarLinkOrder: ["home", "dataImport", "profile"] as const,
} satisfies AppConfig;
