import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/** A point on the map, in WGS 84 degrees. */
export type PlaceCoordinate = { latitude: number; longitude: number };

/**
 * One place as the place form produces it, before it has an identity. Text
 * fields left empty are `undefined`, which is stored as SQL `NULL`.
 */
export type PlaceInput = {
  name: string;
  address: string | undefined;
  latitude: number;
  longitude: number;

  /** Local wall-clock time, `YYYY-MM-DDTHH:mm` (a `datetime-local` value). */
  startsAt: string | undefined;

  /** Local wall-clock time, `YYYY-MM-DDTHH:mm`. */
  endsAt: string | undefined;
  notes: string | undefined;
};

/** One stored place: its input plus the id that Edit, Move, and Delete use. */
export type PlaceRow = PlaceInput & { placeId: string };

/** Who is reading or writing a places dataset, and which one. */
type PlacesStoreTarget = Readonly<{
  workspaceId: Workspace.Id;
  userId: User.Id;
  datasetId: Dataset.Id;
}>;

/**
 * Where a places dataset's rows live. The GIS app's place tool reads and
 * rewrites rows only through this, so the storage behind it (a virtual
 * dataset, or a rewritten CSV dataset) can change without touching the UI.
 */
export type PlacesStore = {
  createPlacesDataset: (
    options: Readonly<{
      workspaceId: Workspace.Id;
      userId: User.Id;
      datasetName: string;
    }>,
  ) => Promise<Dataset.T>;
  readPlaces: (options: PlacesStoreTarget) => Promise<PlaceRow[]>;
  writePlaces: (
    options: PlacesStoreTarget & Readonly<{ rows: readonly PlaceRow[] }>,
  ) => Promise<void>;

  /** Ids of the workspace's places datasets. A React hook. */
  usePlacesDatasetIds: (workspaceId: Workspace.Id) => ReadonlySet<Dataset.Id>;
};
