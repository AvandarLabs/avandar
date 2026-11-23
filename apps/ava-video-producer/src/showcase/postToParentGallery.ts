/**
 * Posts a film status or acknowledgement message to the same-origin parent
 * gallery. Called by `LiveFilmPlayer` and `useFilmControl`.
 */
export function postToParentGallery(message: object): void {
  window.parent.postMessage(message, location.origin);
}
