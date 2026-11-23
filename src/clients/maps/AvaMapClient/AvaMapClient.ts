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
    queries: (config) => {
      return {
        /**
         * The map's secret displacement salt, or undefined when the caller
         * cannot edit the map. The salt lives in its own table that only map
         * editors can read, so a viewer can never undo a published map's
         * displacement. Creates the salt for a map that predates salts.
         */
        getJitterSalt: async (params: {
          mapId: AvaMap.Id;
        }): Promise<string | undefined> => {
          const { data } = await config.dbClient
            .rpc("rpc_maps__get_or_create_jitter_salt", {
              p_map_id: params.mapId,
            })
            .throwOnError();
          return data ?? undefined;
        },
      };
    },
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
    queryFns: ["getJitterSalt"],
    mutationFns: ["saveMapConfig", "insert", "update", "delete"],
  },
);
