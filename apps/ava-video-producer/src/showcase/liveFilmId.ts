/** The film this live player shows, from the page URL's `id` parameter. */
export const LIVE_FILM_ID: string =
  new URLSearchParams(location.search).get("id") ?? "avandar-home";
