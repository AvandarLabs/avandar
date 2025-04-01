import "@mantine/core";

declare module "@mantine/core" {
  export interface MantineThemeOther {
    navbar: {
      /** Navbar background color */
      backgroundColor: string;

      /** Navbar text color */
      textColor: string;

      /** Navbar link background color on hover */
      hoverBackgroundColor: string;

      /** Active navbar link background color*/
      activeBackgroundColor: string;

      /** Active navbar link background color on hover */
      activeHoverBackgroundColor: string;
    };
  }
}
