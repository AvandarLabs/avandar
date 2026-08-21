import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** Each contributing dataset's key column, by dataset id. */
type PrimaryKeyColumnNameByDatasetId = Record<Dataset.Id, string | undefined>;

/** The ontology rows one concept's relation columns are derived from. */
export type ConceptRelationMetadata = {
  /** Every attribute of the concept. Each becomes exactly one column. */
  attributes: ConceptAttribute.T[];
  /** Every mapping that populates one of those attributes, of any type. */
  mappings: AttributeMapping[];
  /** Every dataset column those mappings name, keyed by id. */
  datasetColumnsById: Record<DatasetColumn.Id, DatasetColumn.T | undefined>;
};

/**
 * One attribute's column, and the dataset it reads.
 *
 * The dataset id travels beside the column rather than being read back off it:
 * `ConceptAttributeColumn.datasetId` is a plain `string`, because the view
 * builder only ever interpolates it, so recovering a `Dataset.Id` from it would
 * take a cast this can avoid by simply not throwing the type away.
 */
type BuiltAttributeColumn = {
  column: ConceptAttributeColumn;
  contributingDatasetId: Dataset.Id | undefined;
};

/** One attribute whose name collided with an earlier one, and its new name. */
export type RenamedConceptAttributeColumn = {
  attributeId: ConceptAttribute.Id;
  requestedName: string;
  emittedName: string;
};

/** A concept's relation columns, and the datasets they read. */
export type ConceptAttributeColumns = {
  attributeColumns: ConceptAttributeColumn[];
  /**
   * The datasets the columns read. These must be loaded into DuckDB before the
   * view is created, because the view binds its `ava_rows_` sources at
   * creation time rather than at query time.
   */
  contributingDatasetIds: Dataset.Id[];
  /**
   * Collisions this call renamed around, returned rather than logged so this
   * stays free of a logger dependency and so a test can assert the renaming
   * directly. `concept_attributes` has no unique constraint on
   * `(concept_id, name)`, so two attributes of one concept really can share a
   * name, and a view with two identically named columns would not compile.
   */
  renamedColumns: RenamedConceptAttributeColumn[];
};

/**
 * Orders attributes so two runs over unchanged metadata agree.
 *
 * By name first, because the emitted column order is by name, and by id to
 * break a tie. The tie is not hypothetical: duplicate names are exactly the
 * case `renamedColumns` exists for, and which of the two keeps the unsuffixed
 * name has to be decided the same way every run.
 */
function _compareAttributes(
  left: Readonly<ConceptAttribute.T>,
  right: Readonly<ConceptAttribute.T>,
): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

/**
 * Narrows a mapping to the dataset-column arm.
 *
 * A predicate on `type` does not narrow the union for the compiler, so this
 * has to be a type guard rather than a `propEq`.
 */
function _isDatasetColumnMapping(
  mapping: Readonly<AttributeMapping>,
): mapping is DatasetColumnMapping {
  return mapping.type === "dataset_column";
}

/**
 * Every dataset-column mapping for one attribute, in a stable order.
 *
 * Ordered by dataset id then mapping id so an attribute with several mappings
 * always reads the same one. An attribute mapped to two datasets is a shape the
 * schema allows and the demo does not use; taking the first rather than
 * emitting two columns keeps the relation at one column per attribute, which is
 * what `structuredQueryToSql` selects by name.
 */
function _getDatasetColumnMappingsForAttribute(
  options: Readonly<{
    attributeId: ConceptAttribute.Id;
    mappings: readonly AttributeMapping[];
  }>,
): DatasetColumnMapping[] {
  return options.mappings
    .filter(_isDatasetColumnMapping)
    .filter((mapping) => {
      return mapping.conceptAttributeId === options.attributeId;
    })
    .sort((left, right) => {
      return (
        left.datasetId.localeCompare(right.datasetId) ||
        left.id.localeCompare(right.id)
      );
    });
}

/**
 * The dataset column that carries each contributing dataset's entity key.
 *
 * This is the lookup the whole relation hangs on, and getting it wrong is
 * silent: a correlated subquery keyed on the wrong column matches no row and
 * every value comes back NULL, which no type catches. So a dataset that
 * contributes a column but has no identifier attribute mapped into it is a
 * throw below rather than a missing entry here.
 *
 * A dataset reached by two identifier attributes is resolved by attribute
 * order, not by insertion order, so two runs pick the same key column.
 */
function _getPrimaryKeyColumnNameByDatasetId(
  metadata: Readonly<ConceptRelationMetadata>,
): PrimaryKeyColumnNameByDatasetId {
  const identifierAttributes = metadata.attributes
    .filter((attribute) => {
      return (
        attribute.isIdentifier && attribute.mappingType === "dataset_column"
      );
    })
    .sort(_compareAttributes);

  const primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId = {};
  identifierAttributes.forEach((attribute) => {
    _getDatasetColumnMappingsForAttribute({
      attributeId: attribute.id,
      mappings: metadata.mappings,
    }).forEach((mapping) => {
      // First writer wins, which is what makes attribute order decide.
      if (primaryKeyColumnNameByDatasetId[mapping.datasetId] !== undefined) {
        return;
      }
      const datasetColumn =
        metadata.datasetColumnsById[mapping.datasetColumnId];
      if (datasetColumn) {
        primaryKeyColumnNameByDatasetId[mapping.datasetId] = datasetColumn.name;
      }
    });
  });
  return primaryKeyColumnNameByDatasetId;
}

/** The typed NULL column an attribute with nothing to read becomes. */
function _buildUnmappedColumn(
  attribute: Readonly<ConceptAttribute.T>,
): ConceptAttributeColumn {
  return {
    kind: "unmapped",
    attributeName: attribute.name,
    duckDbDataType: DuckDbDataTypeUtils.fromDatasetColumnType(
      attribute.dataType,
    ),
  };
}

/**
 * Turns one attribute into the column the concept's view emits for it.
 *
 * A `manual_entry` attribute, and an attribute with no mapping row at all,
 * become a typed NULL rather than an error. Today
 * `getAttributeAssertions._getAssertionsByMappingType` throws for any
 * manual-entry mapping, so one manually entered attribute makes a whole concept
 * unqueryable; a typed NULL keeps the relation's schema complete and is honest,
 * because we hold no value for it.
 */
function _buildAttributeColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    metadata: ConceptRelationMetadata;
    primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId;
  }>,
): BuiltAttributeColumn {
  const { attribute, metadata } = options;
  const mapping = _getDatasetColumnMappingsForAttribute({
    attributeId: attribute.id,
    mappings: metadata.mappings,
  })[0];

  if (attribute.mappingType === "manual_entry" || mapping === undefined) {
    return {
      column: _buildUnmappedColumn(attribute),
      contributingDatasetId: undefined,
    };
  }

  // Fail closed rather than degrading to a NULL column. A mapping pointing at
  // a column that no longer exists is a broken ontology, and answering the
  // query with NULLs would report "no value" for data that may well exist.
  const datasetColumn = metadata.datasetColumnsById[mapping.datasetColumnId];
  if (!datasetColumn) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) is mapped to ` +
        `dataset column '${mapping.datasetColumnId}', which does not exist.`,
    );
  }

  const primaryKeyColumnName =
    options.primaryKeyColumnNameByDatasetId[mapping.datasetId];
  if (primaryKeyColumnName === undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) reads dataset ` +
        `'${mapping.datasetId}', which has no identifier attribute mapped ` +
        `into it, so its rows cannot be matched to an individual.`,
    );
  }

  return {
    column: {
      kind: "dataset_column",
      attributeName: attribute.name,
      selectColumnName: datasetColumn.name,
      datasetId: mapping.datasetId,
      primaryKeyColumnName,
      valuePickerRuleType: mapping.valuePickerRuleType,
      isArray: attribute.isArray,
    },
    contributingDatasetId: mapping.datasetId,
  };
}

/**
 * Suffixes a name that an earlier attribute already took.
 *
 * `<name>_2`, `<name>_3`, and so on, matching the order
 * `_compareAttributes` fixes, so the alphabetically first attribute id keeps
 * the plain name.
 */
function _getUniqueColumnName(
  options: Readonly<{ requestedName: string; takenNames: ReadonlySet<string> }>,
): string {
  if (!options.takenNames.has(options.requestedName)) {
    return options.requestedName;
  }
  let suffix = 2;
  while (options.takenNames.has(`${options.requestedName}_${suffix}`)) {
    suffix += 1;
  }
  return `${options.requestedName}_${suffix}`;
}

/**
 * Turns one concept's ontology rows into the columns its DuckDB view emits.
 *
 * Pure on purpose, and it is the half of the concept relation that no type can
 * protect: every mistake it can make (the wrong identifier column, a mapping
 * read from the wrong dataset) produces a view that compiles and returns
 * all-NULL columns. So it takes rows rather than clients, and its test drives
 * real SQL over a fake concept instead of asserting the shape of this return
 * value.
 *
 * One column per attribute, never one per mapping. That is the difference from
 * `getDatasetColumnAssertions`, which iterates mappings and therefore emits an
 * attribute twice when it has two.
 */
export function makeConceptAttributeColumnsFromMetadata(
  metadata: Readonly<ConceptRelationMetadata>,
): ConceptAttributeColumns {
  const primaryKeyColumnNameByDatasetId =
    _getPrimaryKeyColumnNameByDatasetId(metadata);
  const orderedAttributes = [...metadata.attributes].sort(_compareAttributes);

  const attributeColumns: ConceptAttributeColumn[] = [];
  const contributingDatasetIds = new Set<Dataset.Id>();
  const renamedColumns: RenamedConceptAttributeColumn[] = [];
  const takenNames = new Set<string>();

  orderedAttributes.forEach((attribute) => {
    const { column, contributingDatasetId } = _buildAttributeColumn({
      attribute,
      metadata,
      primaryKeyColumnNameByDatasetId,
    });
    if (contributingDatasetId !== undefined) {
      contributingDatasetIds.add(contributingDatasetId);
    }
    const emittedName = _getUniqueColumnName({
      requestedName: column.attributeName,
      takenNames,
    });
    if (emittedName !== column.attributeName) {
      renamedColumns.push({
        attributeId: attribute.id,
        requestedName: column.attributeName,
        emittedName,
      });
    }
    takenNames.add(emittedName);
    attributeColumns.push({ ...column, attributeName: emittedName });
  });

  return {
    attributeColumns,
    contributingDatasetIds: [...contributingDatasetIds].sort(),
    renamedColumns,
  };
}
