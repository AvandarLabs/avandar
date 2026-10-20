/** Share one source-watch connection across the supplied live players. */
export function watchFilms(players: HTMLIFrameElement[], onReload?: () => void): () => void;
