import type { Input } from "./CacheReuse.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  request: {
    key: "tile:7",
    label: "Tile lookup",
  },
  result: {
    label: "Tile 7",
    value: "Sample tile",
  },
  systemLabels: {
    requester: "Viewer",
    cache: "Stored copy",
    origin: "Tile source",
  },
  pathLabels: {
    miss: "Not stored yet",
    store: "Keep a copy",
    hit: "Use stored copy",
  },
  showStoredValue: true,
  showPathLabels: true,
};
/** Accepted minimum, crowded, changed, and toggle cases. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      request: {
        key: "tile:7",
        label: "Tile lookup",
      },
      result: {
        label: "Tile 7",
        value: "Sample tile",
      },
      systemLabels: {
        requester: "Viewer",
        cache: "Stored copy",
        origin: "Tile source",
      },
      pathLabels: {
        miss: "Not stored yet",
        store: "Keep a copy",
        hit: "Use stored copy",
      },
      showStoredValue: true,
      showPathLabels: true,
    },
  },
  {
    id: "minimum",
    input: {
      request: {
        key: "K",
        label: "Q",
      },
      result: {
        label: "R",
        value: "V",
      },
      systemLabels: {
        requester: "Viewer",
        cache: "Stored copy",
        origin: "Tile source",
      },
      pathLabels: {
        miss: "Not stored yet",
        store: "Keep a copy",
        hit: "Use stored copy",
      },
      showStoredValue: true,
      showPathLabels: true,
    },
  },
  {
    id: "dense",
    input: {
      request: {
        key: "WWWWWWWWWWWWWWWWWWWW",
        label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      },
      result: {
        label: "WWWWWWWWWWWWWWWWWWWW",
        value: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      systemLabels: {
        requester: "WWWWWWWWWWWWWWWWWWWWWW",
        cache: "WWWWWWWWWWWWWWWWWWWWWW",
        origin: "WWWWWWWWWWWWWWWWWWWWWW",
      },
      pathLabels: {
        miss: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        store: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        hit: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showStoredValue: true,
      showPathLabels: true,
    },
  },
  {
    id: "changed",
    input: {
      request: {
        key: " tile\t7 ",
        label: "Exact sample lookup",
      },
      result: {
        label: "Stored sample",
        value: " result\nvalue ",
      },
      systemLabels: {
        requester: "Viewer",
        cache: "Resident tier",
        origin: "Tile source",
      },
      pathLabels: {
        miss: "Not stored yet",
        store: "Keep a copy",
        hit: "Use stored copy",
      },
      showStoredValue: false,
      showPathLabels: false,
    },
  },
];
