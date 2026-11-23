import { useState } from "react";
import { isReducedMotionPreferred } from "./isReducedMotionPreferred";
import type { MotionGalleryState } from "./useMotionGalleryState/useMotionGalleryState.types";
/** Holds the motion gallery filters and its shared playback preference. */
export function useMotionFilters(): Pick<
  MotionGalleryState,
  | "category"
  | "selectCategory"
  | "collection"
  | "setCollection"
  | "query"
  | "setQuery"
  | "playing"
  | "setPlaying"
> {
  const [category, setCategory] = useState("All motions");
  const [collection, setCollection] = useState("all");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(() => {
    return !isReducedMotionPreferred();
  });
  const selectCategory = (value: string) => {
    setCategory(value);
    setQuery("");
  };
  return {
    category,
    selectCategory,
    collection,
    setCollection,
    query,
    setQuery,
    playing,
    setPlaying,
  };
}
