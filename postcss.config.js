export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em", // small phones (e.g. iPhone SE)
        "mantine-breakpoint-sm": "48em", // tablets/large phones
        "mantine-breakpoint-md": "62em", // small laptops/tablets landscape
        "mantine-breakpoint-lg": "75em", // standard laptops/desktops
        "mantine-breakpoint-xl": "88em", // large desktops/4K displays
      },
    },
  },
};
