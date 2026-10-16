import {
  SocrataCountResponseSchema,
  SocrataViewMetadataSchema,
} from "$/connectors/open-data/SocrataClient/SocrataClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type {
  SocrataClient,
  SocrataViewMetadata,
} from "$/connectors/open-data/SocrataClient/SocrataClient.types.ts";

function _trimTrailingSlash(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Reads Socrata view metadata and resource rows over an injected HTTP layer.
 *
 * Stateless, and every call takes its base URL as an argument, mirroring
 * `CkanClient` exactly: one client serves every Socrata-hosted portal, from
 * `data.cityofnewyork.us` to any other government deployment of the same
 * platform.
 */
export function createSocrataClient(
  http: Readonly<OpenDataHttp>,
): SocrataClient {
  return {
    getMetadata: async ({
      baseUrl,
      socrataDatasetId,
    }): Promise<SocrataViewMetadata> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/api/views/${socrataDatasetId}.json`;
      try {
        const body = await http.getJson(url);
        const wire = SocrataViewMetadataSchema.parse(body);
        return {
          id: wire.id,
          name: wire.name,
          rowsUpdatedAt: wire.rowsUpdatedAt,
          viewLastModified: wire.viewLastModified,
        };
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },

    getRowCount: async ({ baseUrl, socrataDatasetId }): Promise<number> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/resource/${socrataDatasetId}.json?%24select=count(*)`;
      try {
        const body = await http.getJson(url);
        const [row] = SocrataCountResponseSchema.parse(body);
        return Number(row?.count ?? "0");
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },

    getRows: async ({
      baseUrl,
      socrataDatasetId,
      maxRows,
    }): Promise<string> => {
      const root = _trimTrailingSlash(baseUrl);
      const url = `${root}/resource/${socrataDatasetId}.csv?%24limit=${maxRows}`;
      try {
        const bytes = await http.getBytes(url);
        return new TextDecoder().decode(bytes);
      } catch (cause) {
        throw new OpenDataAcquisitionFailed(
          { code: "socrata-unreachable", socrataDatasetId },
          cause,
        );
      }
    },
  };
}
