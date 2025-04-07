/** @type {import('tailwindcss').Config} */
import { DEFAULT_THEME } from "@mantine/core";
import { Theme } from "./src/config/Theme";

/**
 * Convert all our mantine colors to tailwind color objects.
 * "mantineColor.0" through "mantineColor.9" will map to tailwind
 * color suffixes 50 through 900.
 *
 * For example, "neutral0" will now be "[attribute]-color-50"
 * (e.g. "bg-color-50")
 */
function mantineColorsToTailwindObjects() {
  const tailwindShadeLevels = [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ];
  const finalTailwindColors = {};
  const allColors = { ...DEFAULT_THEME.colors, ...Theme.colors };
  Object.keys(allColors).forEach((colorKey) => {
    const tailwindColorObj = {};
    const mantineColorTuple = allColors[colorKey];
    tailwindShadeLevels.forEach((shadeLevel, i) => {
      tailwindColorObj[shadeLevel] = mantineColorTuple[i];
    });
    finalTailwindColors[colorKey] = tailwindColorObj;
  });
  return finalTailwindColors;
}

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: mantineColorsToTailwindObjects(),
    },
  },
  plugins: [],
};
