import { AvaMapParsers } from "$/models/AvaMap/AvaMapParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import { MapSaveConflictError } from "./MapSaveConflictError";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

type SaveMapConfigInput = {
  mapId: AvaMap.Id;
  name: string;
  mapConfig: AvaMapConfig.T;
  expectedUpdatedAt: string;
};

function _isNoRowsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

/** Persists AvaMap rows and their JSON-backed configuration. */
export const AvaMapClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "AvaMap",
    tableName: "maps",
    dbTablePrimaryKey: "id",
    parsers: AvaMapParsers,
    mutations: (config) => {
      return {
        // Persists a map's name and normalized JSON configuration.
        saveMapConfig: async (
          params: SaveMapConfigInput,
        ): Promise<AvaMap.T> => {
          const dbUpdate = config.parsers.fromModelUpdateToDBUpdate({
            name: params.name,
            config: params.mapConfig,
          });
          try {
            const { data } = await config.dbClient
              .from("maps")
              .update(dbUpdate)
              .eq("id", params.mapId)
              .eq("updated_at", params.expectedUpdatedAt)
              .select("*")
              .single()
              .throwOnError();

            return config.parsers.fromDBReadToModelRead(data);
          } catch (error) {
            if (_isNoRowsError(error)) {
              throw new MapSaveConflictError(params.mapId);
            }
            throw error;
          }
        },
      };
    },
  }),
  {
    mutationFns: ["saveMapConfig", "insert", "update", "delete"],
  },
);
