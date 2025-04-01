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
    db.version(DB_VERSION).stores({ datasets: "++id" });
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
   */
  getDataset(id: string): Promise<LocalDataset.T | undefined> {
    return db.datasets.get(id);
  }
}

export const LocalDatasetService = new LocalDatasetServiceClient();
