import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type {
  ConceptAttributeColumn,
  ConceptAttributeValueRule,
} from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";

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
    .sort(ConceptAttribute.compareInViewOrder);

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

/**
 * The typed column an attribute with nothing to read becomes: a NULL, or an
 * empty list for a list or per-period attribute.
 */
function _buildUnmappedColumn(
  attribute: Readonly<ConceptAttribute.T>,
): ConceptAttributeColumn {
  return {
    kind: "unmapped",
    attributeId: attribute.id,
    attributeName: attribute.name,
    duckDbDataType: DuckDbDataTypeUtils.fromDatasetColumnType(
      attribute.dataType,
    ),
    valueShape: ConceptAttribute.getValueShape(attribute),
  };
}

/**
 * Whether a date column loads as a `TIMESTAMP WITH TIME ZONE`. It keeps the
 * zoned type its file was detected with only while its stored type is still
 * `timestamp`. A column retyped to `timestamp` from another detected type is
 * cast to a plain `TIMESTAMP` on load, which has no zone.
 */
function _isZonedTimestampColumn(column: DatasetColumn.T): boolean {
  return (
    column.dataType === "timestamp" &&
    (column.detectedDataType === "TIMESTAMP_TZ" ||
      column.detectedDataType === "TIMESTAMP WITH TIME ZONE")
  );
}

/**
 * A per-period field's period and the date column it groups its rows by.
 *
 * Fails closed, like the value column: a period with no readable date column
 * would answer every record with an empty list, which reads as "no data"
 * for data that may well exist.
 */
function _buildBucket(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): Pick<
  Extract<ConceptAttributeValueRule, { valueShape: "bucketed_list" }>,
  "bucketGrain" | "bucketColumnName" | "isBucketColumnZoned"
> {
  const { attribute, mapping, metadata } = options;
  const field = `Concept attribute '${attribute.name}' (${attribute.id})`;
  // `getValueShape` is per-period only for a field with a period; this
  // restates that for the compiler.
  if (attribute.bucketGrain === undefined) {
    throw new Error(`${field} has no period.`);
  }
  if (mapping.bucketColumnId === undefined) {
    throw new Error(
      `${field} keeps one value per ${attribute.bucketGrain}, but its ` +
        `mapping names no date column.`,
    );
  }
  const bucketColumn = metadata.datasetColumnsById[mapping.bucketColumnId];
  if (!bucketColumn) {
    throw new Error(
      `${field} groups its rows by date column '${mapping.bucketColumnId}', ` +
        `which does not exist.`,
    );
  }
  if (bucketColumn.datasetId !== mapping.datasetId) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}' of dataset ` +
        `'${bucketColumn.datasetId}', not of the dataset it reads ` +
        `('${mapping.datasetId}').`,
    );
  }
  if (!ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType)) {
    throw new Error(
      `${field} groups its rows by column '${bucketColumn.name}', which is ` +
        `'${bucketColumn.dataType}', not a date or timestamp.`,
    );
  }
  return {
    bucketGrain: attribute.bucketGrain,
    bucketColumnName: bucketColumn.name,
    isBucketColumnZoned: _isZonedTimestampColumn(bucketColumn),
  };
}

/**
 * How one dataset-column attribute's rows become its value, from the
 * attribute's value shape. A list keeps every value and drops any rule its
 * mapping still stores. A single value needs a rule, and an attribute without
 * one is a broken ontology: guessing a rule would answer with a value nobody
 * chose, so it throws, naming the attribute. A per-period field needs a rule
 * and a date column of its own dataset.
 */
function _getValueRule(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): ConceptAttributeValueRule {
  const { attribute, mapping } = options;
  const ruleType = mapping.valuePickerRuleType;
  const valueShape = ConceptAttribute.getValueShape(attribute);
  // A date column means something only to a per-period field; anywhere else
  // the ontology is inconsistent, and ignoring it would hide that.
  if (valueShape !== "bucketed_list" && mapping.bucketColumnId !== undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) has no ` +
        `period, but its mapping names date column '${mapping.bucketColumnId}'.`,
    );
  }
  return match(valueShape)
    .returnType<ConceptAttributeValueRule>()
    .with("single", () => {
      if (ruleType === undefined) {
        throw new Error(
          `Concept attribute '${attribute.name}' (${attribute.id}) keeps one ` +
            `value, but its mapping names no value rule.`,
        );
      }
      return { valueShape: "single", valuePickerRuleType: ruleType };
    })
    .with("list", () => {
      return { valueShape: "list" };
    })
    .with("bucketed_list", () => {
      if (ruleType === undefined) {
        throw new Error(
          `Concept attribute '${attribute.name}' (${attribute.id}) keeps ` +
            `one value per period, but its mapping names no value rule.`,
        );
      }
      return {
        valueShape: "bucketed_list",
        valuePickerRuleType: ruleType,
        ..._buildBucket(options),
      };
    })
    .exhaustive();
}

/**
 * Throws when a single-value attribute applies a rule its column's current
 * type does not allow, which happens when the rule was saved without checking
 * the column's type, or when the column's type changed afterwards. DuckDB
 * would otherwise refuse the whole view (`sum(VARCHAR)` does not bind), or
 * answer `max` over a yes/no column with a value the rule table calls
 * meaningless, and neither names the field. A per-period attribute applies
 * its rule to each period, so it is checked the same way. A list attribute
 * applies no rule, so it is not checked.
 */
function _assertRuleAllowedForColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    valueRule: ConceptAttributeValueRule;
    datasetColumn: DatasetColumn.T;
  }>,
): void {
  const { attribute, valueRule, datasetColumn } = options;
  if (valueRule.valueShape === "list") {
    return;
  }
  const { valuePickerRuleType } = valueRule;
  if (
    ValuePickerRule.isAllowedForColumnType({
      ruleType: valuePickerRuleType,
      columnDataType: datasetColumn.dataType,
    })
  ) {
    return;
  }
  throw new Error(
    `Concept attribute '${attribute.name}' (${attribute.id}) applies ` +
      `'${valuePickerRuleType}' to dataset column ` +
      `'${datasetColumn.name}', whose type '${datasetColumn.dataType}' ` +
      `does not allow it.`,
  );
}

/**
 * The dataset column a mapping names.
 *
 * Fails closed rather than degrading to a NULL column. A mapping pointing at
 * a column that no longer exists is a broken ontology, and answering the
 * query with NULLs would report "no value" for data that may well exist.
 */
function _getDatasetColumnForMapping(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
  }>,
): DatasetColumn.T {
  const { attribute, mapping, metadata } = options;
  const datasetColumn = metadata.datasetColumnsById[mapping.datasetColumnId];
  if (!datasetColumn) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) is mapped to ` +
        `dataset column '${mapping.datasetColumnId}', which does not exist.`,
    );
  }
  return datasetColumn;
}

/**
 * The key column of the dataset a mapping reads. A dataset with no identifier
 * attribute mapped into it cannot match its rows to an individual, so this
 * throws rather than returning a key every row would miss.
 */
function _getPrimaryKeyColumnNameForMapping(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId;
  }>,
): string {
  const { attribute, mapping } = options;
  const primaryKeyColumnName =
    options.primaryKeyColumnNameByDatasetId[mapping.datasetId];
  if (primaryKeyColumnName === undefined) {
    throw new Error(
      `Concept attribute '${attribute.name}' (${attribute.id}) reads dataset ` +
        `'${mapping.datasetId}', which has no identifier attribute mapped ` +
        `into it, so its rows cannot be matched to an individual.`,
    );
  }
  return primaryKeyColumnName;
}

/**
 * The column a dataset-column attribute becomes, once its mapping, dataset
 * column, value rule, and dataset key have each been checked.
 */
function _buildMappedAttributeColumn(
  options: Readonly<{
    attribute: ConceptAttribute.T;
    mapping: DatasetColumnMapping;
    metadata: ConceptRelationMetadata;
    primaryKeyColumnNameByDatasetId: PrimaryKeyColumnNameByDatasetId;
  }>,
): ConceptAttributeColumn {
  const { attribute, mapping, metadata } = options;
  const datasetColumn = _getDatasetColumnForMapping({
    attribute,
    mapping,
    metadata,
  });
  const valueRule = _getValueRule({ attribute, mapping, metadata });
  _assertRuleAllowedForColumn({ attribute, valueRule, datasetColumn });

  return {
    kind: "dataset_column",
    attributeId: attribute.id,
    attributeName: attribute.name,
    selectColumnName: datasetColumn.name,
    datasetId: mapping.datasetId,
    columnDataType: datasetColumn.dataType,
    primaryKeyColumnName: _getPrimaryKeyColumnNameForMapping({
      attribute,
      mapping,
      primaryKeyColumnNameByDatasetId: options.primaryKeyColumnNameByDatasetId,
    }),
    ...valueRule,
  };
}

/**
 * Turns one attribute into the column the concept's view emits for it.
 *
 * A `manual_entry` attribute, and an attribute with no mapping row at all,
 * become a typed NULL, or an empty list for a list or per-period attribute,
 * rather than an error. Do not throw for them instead: one manually entered
 * attribute would make the whole concept unqueryable, while a typed column
 * keeps the relation's schema complete and is honest, because no value is
 * stored for it.
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

  return {
    column: _buildMappedAttributeColumn({ ...options, mapping }),
    contributingDatasetId: mapping.datasetId,
  };
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
 * One column per attribute, never one per mapping. Iterating mappings instead
 * would emit an attribute twice when it has two.
 */
export function makeConceptAttributeColumnsFromMetadata(
  metadata: Readonly<ConceptRelationMetadata>,
): ConceptAttributeColumns {
  const primaryKeyColumnNameByDatasetId =
    _getPrimaryKeyColumnNameByDatasetId(metadata);
  const orderedAttributes = [...metadata.attributes].sort(
    ConceptAttribute.compareInViewOrder,
  );
  const viewColumnNames = ConceptAttribute.getViewColumnNames(
    metadata.attributes,
  );

  const attributeColumns: ConceptAttributeColumn[] = [];
  const contributingDatasetIds = new Set<Dataset.Id>();
  const renamedColumns: RenamedConceptAttributeColumn[] = [];

  orderedAttributes.forEach((attribute) => {
    const { column, contributingDatasetId } = _buildAttributeColumn({
      attribute,
      metadata,
      primaryKeyColumnNameByDatasetId,
    });
    if (contributingDatasetId !== undefined) {
      contributingDatasetIds.add(contributingDatasetId);
    }
    const emittedName =
      viewColumnNames.get(attribute.id)?.columnName ?? column.attributeName;
    if (emittedName !== column.attributeName) {
      renamedColumns.push({
        attributeId: attribute.id,
        requestedName: column.attributeName,
        emittedName,
      });
    }
    attributeColumns.push({ ...column, attributeName: emittedName });
  });

  return {
    attributeColumns,
    contributingDatasetIds: [...contributingDatasetIds].sort(),
    renamedColumns,
  };
}
