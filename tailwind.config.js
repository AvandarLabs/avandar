/** @type {import('tailwindcss').Config} */
import { Theme } from "./src/config/Theme";

function mantineToTailwindColorSpec(mantineColorTuple) {
  const colorObj = {};
  colors.forEach((colorKey, i) => {
    colorObj[colorKey] = mantineColorTuple[i];
  });
  return colorObj;
}

function mantineColorsToTailwindSpec() {
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
  Object.keys(Theme.colors).forEach((colorKey) => {
    const tailwindColorObj = {};
    const mantineColorTuple = Theme.colors[colorKey];
    tailwindShadeLevels.forEach((shadeLevel, i) => {
      tailwindColorObj[shadeLevel] = mantineColorTuple[i];
    });
    finalTailwindColors[colorKey] = tailwindColorObj;
  });
  return finalTailwindColors;
}

console.log(mantineColorsToTailwindSpec());

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: mantineColorsToTailwindSpec(),
    },
  },
  plugins: [],
};
