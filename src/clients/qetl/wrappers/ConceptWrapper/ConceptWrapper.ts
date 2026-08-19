import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { buildConceptQueryResult } from "@/clients/qetl/wrappers/ConceptWrapper/buildConceptQueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";
import type {
  RelationColumn,
  RelationSchema,
} from "$/models/relations/RelationSchema/RelationSchema.types";
import type {
  PushDownRequest,
  SourceWrapper,
  WrapperContext,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * The two reads a concept relation is built from, injected so a test needs no
 * client mocks: its columns come from `concept_attributes` and its rows come
 * from the attribute-assertion resolver.
 */
export type ConceptWrapperDependencies = {
  /** The concept's attributes, which are its relation's columns. */
  getConceptAttributes: (params: {
    conceptId: Concept.Id;
    workspaceId: Workspace.Id;
  }) => Promise<readonly ConceptAttribute.T[]>;

  /** The concept's extension: one row per individual, keyed by attribute id. */
  getConceptExtension: (params: {
    conceptId: Concept.Id;
    conceptAttributes: readonly ConceptAttribute.T[];
    workspaceId: Workspace.Id;
  }) => Promise<ReadonlyArray<Record<ConceptAttribute.Id, unknown>>>;
};

const CAPABILITIES = {
  relations: "single",

  /**
   * The extension resolver answers for the whole concept at once. It takes no
   * page or range parameter, so there is no smaller unit to ask for.
   */
  acquisitionUnit: { kind: "whole-relation" },

  /**
   * A concept is backed by Postgres online and by local stores offline, so the
   * source itself can filter and aggregate. It is the most capable source in
   * the system, and the only one with an id stable across fetches:
   * `individuals.external_id`, unique per concept by database constraint.
   */
  predicatePushdown: "full",
  aggregatePushdown: true,

  /**
   * `no`, and deliberately, even though Postgres could return the whole
   * extension. A capability record states what this wrapper can be *asked*,
   * and the registry rejects a wrapper declaring one it does not implement.
   * This wrapper implements `pushDown` only, which is also the mode the
   * proposal selects for concepts: full pushdown plus a result cache, with no
   * acquisition machinery. Spec 3 flips this to `yes` on the day it adds an
   * `acquire`, and not before.
   */
  wholeRelationAcquirable: "no",

  /** Postgres imposes no per-call row or byte ceiling on the extension. */
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",

  /** Every contributing row carries `updated_at`. */
  freshnessSignal: "modified-time",

  /**
   * `individuals.external_id` is `not null` and unique per concept, so the same
   * row is identifiable across two fetches.
   */
  rowIdentity: "stable-key",

  /** One transactional store answers every call, so calls agree. */
  multiCallAtomicity: true,

  /** Avandar's own database. No third-party rate limit is shared. */
  quotaScope: { kind: "none" },

  /** No OAuth grant is involved; workspace RLS is the whole authorization. */
  grantedScope: [],
} satisfies RelationCapabilities;

/**
 * Translates one concept attribute into a relation column.
 *
 * `dataType` is always the type of a single value and `isArray` carries the
 * multiplicity, mirroring `concept_attributes` where `data_type` and `is_array`
 * are separate columns. An array attribute must **not** collapse to a bare
 * `LIST`: that value exists in `DuckDbDataType` but carries no element type, so
 * using it would lose the very information a caller needs to build the column.
 */
function _toRelationColumn(attribute: ConceptAttribute.T): RelationColumn {
  return {
    name: attribute.name,
    dataType: DuckDbDataTypeUtils.fromDatasetColumnType(attribute.dataType),
    isArray: attribute.isArray,
  };
}

/** Production reads: `concept_attributes` plus the assertion resolver. */
function _createDefaultDependencies(): ConceptWrapperDependencies {
  return {
    getConceptAttributes: async ({ conceptId }) => {
      return await ConceptAttributeClient.getAll({
        where: { concept_id: { eq: conceptId } },
      });
    },
    getConceptExtension: async (params) => {
      return await AttributeAssertionClient.getConceptExtension(params);
    },
  };
}

/**
 * Declares what an ontology concept can be asked, and delegates to the
 * existing `AttributeAssertionClient` call path unchanged.
 *
 * A concept relation's columns are the concept's `concept_attributes` and its
 * grain is one row per individual, which the database guarantees through
 * `unique (concept_id, external_id)` on `individuals`.
 *
 * `pushDown` ignores the request's SQL and returns the concept's full
 * extension, exactly as `runStructuredQueryWithMetadata` does today: filters,
 * group-bys and sorts are still unapplied, and the returned superset satisfies
 * any projection the caller asked for. Registering the extension as a DuckDB
 * relation, which is what makes the SQL meaningful, is spec 3's work. Nothing
 * calls this method until then.
 */
export function createConceptWrapper(
  dependencies: ConceptWrapperDependencies = _createDefaultDependencies(),
): SourceWrapper<ConceptRelationRef> {
  const { getConceptAttributes, getConceptExtension } = dependencies;

  return {
    name: "concept",
    capabilities: CAPABILITIES,

    handles: (ref: RelationRef.T): ref is ConceptRelationRef => {
      return ref.kind === "concept";
    },

    describe: async (
      ref: ConceptRelationRef,
      ctx: WrapperContext,
    ): Promise<RelationSchema> => {
      const attributes = await getConceptAttributes({
        conceptId: ref.id,
        workspaceId: ctx.workspaceId,
      });
      return { columns: attributes.map(_toRelationColumn) };
    },

    pushDown: async (
      req: PushDownRequest<ConceptRelationRef>,
      ctx: WrapperContext,
    ): Promise<QueryResult.T<UnknownRow>> => {
      const attributes = await getConceptAttributes({
        conceptId: req.ref.id,
        workspaceId: ctx.workspaceId,
      });
      const rows = await getConceptExtension({
        conceptId: req.ref.id,
        conceptAttributes: attributes,
        workspaceId: ctx.workspaceId,
      });
      return buildConceptQueryResult(attributes, rows);
    },
  };
}
