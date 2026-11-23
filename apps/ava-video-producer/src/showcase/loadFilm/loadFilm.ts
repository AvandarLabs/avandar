import { parseFilm } from "./parseFilm";
import type { Film } from "../showcase.types";

/** Fetches one live preview film from the local showcase API. */
export async function loadFilm(id: string): Promise<Film> {
  const response = await fetch(`/api/films/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error("Film unavailable");
  }
  const value: unknown = await response.json();
  return parseFilm(value);
}
