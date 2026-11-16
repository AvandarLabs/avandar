import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { GhoEdmProperty } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";

/** Each GHO entity set's properties, keyed by entity set name. */
export type GhoEntitySetSchemas = ReadonlyMap<
  string,
  readonly GhoEdmProperty[]
>;

function _readAttribute(attributes: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1];
}

function _readEntityTypes(metadataXml: string): Map<string, GhoEdmProperty[]> {
  const entityTypes = new Map<string, GhoEdmProperty[]>();
  const entityTypePattern = /<EntityType\b([^>]*)>([\s\S]*?)<\/EntityType>/g;
  [...metadataXml.matchAll(entityTypePattern)].forEach((entityType) => {
    const name = _readAttribute(entityType[1] ?? "", "Name");
    if (name === undefined) {
      return;
    }
    const properties = [
      ...(entityType[2] ?? "").matchAll(/<Property\b([^>]*?)\/?>/g),
    ].flatMap((property) => {
      const propertyName = _readAttribute(property[1] ?? "", "Name");
      const edmType = _readAttribute(property[1] ?? "", "Type");
      return propertyName === undefined || edmType === undefined
        ? []
        : [{ name: propertyName, edmType }];
    });
    entityTypes.set(name, properties);
  });
  return entityTypes;
}

/**
 * Each entity set's properties, through the entity type it names. An entity
 * set's type is namespace-qualified (`Default.WHS3_62`), and its type's
 * own name is not.
 */
function _getEntitySetSchemasFromMetadata(
  metadataXml: string,
): Map<string, GhoEdmProperty[]> {
  const entityTypes = _readEntityTypes(metadataXml);
  const schemas = new Map<string, GhoEdmProperty[]>();
  [...metadataXml.matchAll(/<EntitySet\b([^>]*?)\/?>/g)].forEach((set) => {
    const name = _readAttribute(set[1] ?? "", "Name");
    const typeName = _readAttribute(set[1] ?? "", "EntityType")
      ?.split(".")
      .pop();
    const properties =
      typeName === undefined ? undefined : entityTypes.get(typeName);
    if (name !== undefined && properties !== undefined) {
      schemas.set(name, properties);
    }
  });
  return schemas;
}

/**
 * Reads GHO's `$metadata` (about 12 MB of OData CSDL) once and returns each
 * entity set's declared properties. An indicator's facts are the entity set
 * named by its code, so the GHO pipeline checks each indicator's schema
 * against `GHO_FACT_COLUMNS` with it.
 *
 * @param params.http - Reads the document.
 * @param params.baseUrl - The GHO drive's base URL.
 * @returns Each entity set's properties, by entity set name.
 * @throws When the document cannot be read, or declares no entity set, so a
 * run never lists indicators without checking their schemas.
 */
export async function readGhoIndicatorSchemas(
  params: Readonly<{ http: OpenDataHttp; baseUrl: string }>,
): Promise<GhoEntitySetSchemas> {
  let metadataXml: string;
  try {
    metadataXml = new TextDecoder().decode(
      await params.http.getBytes(`${params.baseUrl}/$metadata`),
    );
  } catch (error) {
    throw new Error(`GHO's $metadata could not be read.`, { cause: error });
  }
  const schemas = _getEntitySetSchemasFromMetadata(metadataXml);
  if (schemas.size === 0) {
    throw new Error(
      "GHO's $metadata declares no entity set, so no indicator's schema can be checked.",
    );
  }
  return schemas;
}
