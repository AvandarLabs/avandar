import { Dexie } from "dexie";
import * as LocalDataset from "@/models/LocalDataset";
import type { EntityTable } from "dexie";

const DB_VERSION = 1;

type LocalDatasetDatabase = Dexie & {
  datasets: EntityTable<LocalDataset.T, "id">;
};

const db = new Dexie("LocalDatasets") as LocalDatasetDatabase;

class LocalDatasetServiceClient {
  constructor() {
    db.version(DB_VERSION).stores({ datasets: "id" });
  }

  /**
   * Adds a new dataset to the database.
   * @param dataset - The dataset to add
   * @returns A promise that resolves to the ID of the added dataset
   */
  addDataset(dataset: LocalDataset.T): Promise<string> {
    return db.datasets.add(dataset);
  }

  /**
   * Retrieves a dataset by its ID.
   * @param id - The ID of the dataset to retrieve
   * @returns A promise that resolves to the dataset, or undefined if not found
   * @throws ZodError if dataset schema validation fails
   */
  async getDataset(id: string): Promise<LocalDataset.T | undefined> {
    // our dataset schema could have changed by the time we are now loading the
    // dataset back
    const dataset = await db.datasets.get(id);
    return dataset ? LocalDataset.Schema.parse(dataset) : undefined;
  }

  /**
   * Retrieves all datasets from the database.
   *
   * TODO(pablo): needs pagination
   * @returns A promise that resolves to an array of datasets
   */
  getAllDatasets(): Promise<LocalDataset.T[]> {
    return db.datasets.toArray();
  }

  /**
   * Deletes a dataset by its ID.
   * @param id - The ID of the dataset to delete
   * @returns A promise that resolves when the dataset is deleted
   */
  deleteDataset(id: string): Promise<void> {
    return db.datasets.delete(id);
  }
}

export const LocalDatasetService = new LocalDatasetServiceClient();
