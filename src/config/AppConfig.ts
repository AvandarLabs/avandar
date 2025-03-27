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
};

export const AppConfig = {
  logoFilename: "logo.png",
  appName: "Avandar",
};
