import { Dexie } from "dexie";
import {
  LocalDataset,
  LocalDatasetCreate,
  LocalDatasetSchema,
} from "@/models/LocalDataset";
import type { EntityTable } from "dexie";

const DB_VERSION = 1;

type LocalDatasetDatabase = Dexie & {
  datasets: EntityTable<LocalDataset, "id">;
};

const db = new Dexie("LocalDatasets") as LocalDatasetDatabase;

/**
 * Client for managing datasets stored locally in the browser.
 * LocalDatasets are stored in IndexedDB and their full data is
 * stored as a CSV, serialized as a string.
 */
class LocalDatasetClientImpl {
  constructor() {
    db.version(DB_VERSION).stores({ datasets: "++id" });
  }

  /**
   * Adds a new dataset to the database.
   * @param dataset - The dataset to add
   * @returns A promise that resolves to the ID of the added dataset
   */
  addDataset(dataset: LocalDatasetCreate): Promise<number> {
    return db.datasets.add(dataset);
  }

  /**
   * Retrieves a dataset by its ID.
   * @param id - The ID of the dataset to retrieve
   * @returns A promise that resolves to the dataset, or undefined if not found
   * @throws ZodError if dataset schema validation fails
   */
  async getDataset(id: number): Promise<LocalDataset | undefined> {
    // our dataset schema could have changed by the time we are now loading the
    // dataset back
    const dataset = await db.datasets.get(id);
    return dataset ? LocalDatasetSchema.parse(dataset) : undefined;
  }

  /**
   * Retrieves all datasets from the database.
   *
   * TODO(pablo): needs pagination
   * @returns A promise that resolves to an array of datasets
   */
  getAllDatasets(): Promise<LocalDataset[]> {
    return db.datasets.toArray();
  }

  /**
   * Deletes a dataset by its ID.
   * @param id - The ID of the dataset to delete
   * @returns A void promise.
   */
  deleteDataset(id: number): Promise<void> {
    return db.datasets.delete(id);
  }

  /**
   * Deletes the entire database.
   * @returns A void promise.
   */
  deleteDatabase(): Promise<void> {
    return db.delete();
  }
}

export const LocalDatasetClient = new LocalDatasetClientImpl();
