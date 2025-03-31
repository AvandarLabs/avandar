import "@mantine/core";

declare module "@mantine/core" {
  export interface MantineThemeOther {
    navbar: {
      backgroundColor: string;
      textColor: string;
      hoverBackgroundColor: string;
      activeBackgroundColor: string;
      activeHoverBackgroundColor: string;
    };
  }
}
