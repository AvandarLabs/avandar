import { useContext } from "react";
import { GalleryVideoThemeContext } from "./GalleryVideoThemeContext";
import type { GalleryVideoThemeValue } from "./GalleryVideoThemeContext";

/** The gallery theme state. Throws outside `GalleryVideoTheme`. */
export function useGalleryVideoTheme(): GalleryVideoThemeValue {
  const value = useContext(GalleryVideoThemeContext);
  if (!value) {
    throw new Error(
      "Gallery theme state needs a GalleryVideoTheme above this component",
    );
  }
  return value;
}
